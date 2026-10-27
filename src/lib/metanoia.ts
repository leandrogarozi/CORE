import type { MetanoiaFrase, MetanoiaTipo, Settings } from "@/lib/types";

export const NOME_DA_METANOIA = "Metanoia";

/** Quantas frases e perguntas por dia a pessoa pode pedir: de 0 a 10 cada. */
export const MAX_FRASES_POR_DIA = 10;
export const MAX_PERGUNTAS_POR_DIA = 10;

export const AUTOR_DESCONHECIDO = "Autor desconhecido";

/**
 * O crédito que aparece embaixo da frase: só o autor. Frase sem autor mostra "Autor desconhecido"; pergunta sem
 * autor não mostra nada. De onde a frase veio (`fonte`) fica guardado só para a pessoa, no editor e no backup.
 */
export function creditoDaFrase(f: Pick<MetanoiaFrase, "autor" | "tipo">): string {
  const autor = f.autor?.trim();
  if (autor) return autor;
  return f.tipo === "pergunta" ? "" : AUTOR_DESCONHECIDO;
}

function diaNumero(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, d) / 86400000);
}

/** Gerador de números repetível (mulberry32): a mesma semente dá sempre a mesma sequência, no app e no servidor. */
function sorteador(semente: number): () => number {
  let t = semente >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: T[], semente: number): T[] {
  const sorteio = sorteador(semente);
  const saida = [...lista];
  for (let i = saida.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [saida[i], saida[j]] = [saida[j], saida[i]];
  }
  return saida;
}

/** Quantas vezes por dia a pessoa pediu cada tipo (o que ela escolheu em "Quando o FARO me lembra"). */
export function vezesPorDia(s: Pick<Settings, "metanoiaVezes" | "metanoiaPerguntasVezes">, tipo: MetanoiaTipo): number {
  return tipo === "pergunta" ? s.metanoiaPerguntasVezes : s.metanoiaVezes;
}

/**
 * A frase de uma data e de um horário (0, 1, 2...): as frases passam em ordem ALEATÓRIA, e só repetem depois
 * de passar por todas. A cada volta a ordem é sorteada de novo.
 *
 * Sem estado guardado: o sorteio usa uma semente fixa (tipo + número da volta), então o aplicativo (o cartão da
 * tela inicial) e o servidor (a notificação) chegam na mesma frase sem conversar. As favoritas entram duas vezes
 * por volta. A posição anda `porDia` por dia (quantas a pessoa pediu), então com 10 por dia a fila gasta 10
 * frases por dia. Frases e perguntas têm filas separadas.
 */
export function fraseDaVez(frases: MetanoiaFrase[], diaISO: string, horario = 0, tipo: MetanoiaTipo = "frase", porDia = 3): MetanoiaFrase | null {
  const aprovadas = frases.filter((f) => f.status === "aprovada" && f.tipo === tipo).sort((a, b) => a.id.localeCompare(b.id));
  if (!aprovadas.length) return null;
  const fila = [...aprovadas, ...aprovadas.filter((f) => f.favorita)];
  const passo = Math.max(1, Math.round(porDia));
  const posicao = diaNumero(diaISO) * passo + horario;
  const volta = Math.floor(posicao / fila.length);
  const ordem = embaralhar(fila, volta * 2 + (tipo === "pergunta" ? 1 : 0) + 7919);
  // Uma favorita entra duas vezes; o sorteio não deve mostrar a mesma duas vezes seguidas.
  for (let i = 1; i < ordem.length; i++) {
    if (ordem[i].id !== ordem[i - 1].id) continue;
    const j = ordem.findIndex((f, k) => k > i && f.id !== ordem[i].id);
    if (j > 0) [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  return ordem[posicao - volta * fila.length];
}

function paraMinutos(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

function deMinutos(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Os horários do dia: `vezes` mensagens espalhadas por igual entre o início e o fim (a primeira no início, a
 * última no fim, de 5 em 5 minutos). Uma só sai no início. Fim antes do início vira só o início.
 */
export function horariosDaJanela(vezes: number, inicio: string, fim: string, max: number): string[] {
  const n = Math.min(max, Math.max(0, Math.round(vezes)));
  const a = paraMinutos(inicio);
  const b = paraMinutos(fim);
  if (n === 0 || !Number.isFinite(a)) return [];
  if (n === 1 || !Number.isFinite(b) || b <= a) return [deMinutos(a)];
  const lista = Array.from({ length: n }, (_, i) => (i === n - 1 ? b : Math.round((a + ((b - a) * i) / (n - 1)) / 5) * 5));
  return [...new Set(lista)].map(deMinutos);
}

export function horariosEmUso(vezes: number, inicio: string, fim: string): string[] {
  return horariosDaJanela(vezes, inicio, fim, MAX_FRASES_POR_DIA);
}

/** Igual a `horariosEmUso`, para as perguntas. */
export function horariosDePerguntasEmUso(vezes: number, inicio: string, fim: string): string[] {
  return horariosDaJanela(vezes, inicio, fim, MAX_PERGUNTAS_POR_DIA);
}

/**
 * O que está em destaque agora: o que o FARO mandou por último hoje (frase ou pergunta, nos horários que a pessoa
 * escolheu). Antes da primeira do dia, a primeira frase. O cartão da tela inicial e o bloco "Hoje" da Metanoia
 * usam esta mesma conta, para mostrarem sempre a mesma frase.
 */
export function fraseEmDestaque(frases: MetanoiaFrase[], s: Settings, diaISO: string, agora: Date, passos = 0): MetanoiaFrase | null {
  const min = agora.getHours() * 60 + agora.getMinutes();
  let melhor: { quando: number; tipo: MetanoiaTipo; slot: number } = { quando: -1, tipo: "frase", slot: 0 };
  const grupos: [MetanoiaTipo, string[]][] = [
    ["frase", horariosEmUso(s.metanoiaVezes, s.metanoiaInicio, s.metanoiaFim)],
    ["pergunta", horariosDePerguntasEmUso(s.metanoiaPerguntasVezes, s.metanoiaPerguntasInicio, s.metanoiaPerguntasFim)],
  ];
  for (const [tipo, horarios] of grupos) {
    horarios.forEach((h, slot) => {
      const m = paraMinutos(h);
      if (m <= min && m > melhor.quando) melhor = { quando: m, tipo, slot };
    });
  }
  // `passos` anda para frente (positivo) ou para trás (negativo) na mesma fila, para ver outra frase sem esperar.
  const da = (slot: number, tipo: MetanoiaTipo) => fraseDaVez(frases, diaISO, slot + passos, tipo, vezesPorDia(s, tipo));
  return da(melhor.slot, melhor.tipo) ?? da(0, "frase") ?? da(0, "pergunta");
}

export interface FraseSeparada {
  texto: string;
  autor: string | null;
}

/**
 * Transforma um texto colado (ou lido de um print) em frases: uma por parágrafo ou, se for um bloco só, uma por
 * linha. Tira numeração ("23)", "1.", "-") e aspas, e reconhece "frase — Autor" quando o final é curto como um nome.
 */
export function separarFrases(bruto: string): FraseSeparada[] {
  const limpo = bruto.replace(/\r/g, "").trim();
  if (!limpo) return [];
  const blocos = limpo.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const pedacos = blocos.length > 1 ? blocos.map((b) => b.replace(/\s*\n\s*/g, " ")) : limpo.split("\n");
  const saida: FraseSeparada[] = [];
  for (const p of pedacos) {
    let t = p.replace(/\s+/g, " ").trim();
    t = t.replace(/^(\d{1,3}\s*[).:–-]|[-•*·])\s*/, "").trim();
    t = t.replace(/^["“”']+|["“”']+$/g, "").trim();
    let autor: string | null = null;
    const m = t.match(/^(.*\S)\s+[—–-]\s*([A-ZÀ-Ý][\p{L}.'’ ]{2,38})$/u);
    if (m && m[2].trim().split(" ").length <= 4 && !/[.!?]$/.test(m[2])) {
      t = m[1].replace(/["“”]+$/g, "").trim();
      autor = m[2].trim();
    }
    if (t.length >= 8 && t.length <= 400) saida.push({ texto: t, autor });
  }
  return saida;
}
