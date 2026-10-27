import type { MetanoiaFrase, MetanoiaTipo } from "@/lib/types";

export const NOME_DA_METANOIA = "Metanoia";

/** Quantas frases por dia a pessoa pode pedir, e os horários que valem para cada quantidade. */
export const MAX_FRASES_POR_DIA = 3;
/** Perguntas poderosas: até 2 por dia, em horários próprios (as frases não ocupam esses horários). */
export const MAX_PERGUNTAS_POR_DIA = 2;

/** Fontes que só dizem de onde o texto veio para o FARO (print, lista colada): não são crédito de ninguém. */
const FONTE_SO_DE_ORIGEM = /^(prints?\b|lista colada|texto colado)/i;

/** "Fulano · Fonte" para mostrar embaixo da frase. Autor ou fonte desconhecidos não aparecem. */
export function creditoDaFrase(f: Pick<MetanoiaFrase, "autor" | "fonte">): string {
  const fonte = f.fonte?.trim();
  return [f.autor?.trim(), fonte && !FONTE_SO_DE_ORIGEM.test(fonte) ? fonte : ""].filter(Boolean).join(" · ");
}

function diaNumero(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, d) / 86400000);
}

/**
 * A frase de uma data e de um horário (0, 1 ou 2): uma fila que anda e só repete depois de passar por todas.
 *
 * Sem estado guardado: o número do dia e o horário dizem a posição na fila, então o aplicativo (a "frase do
 * dia" no painel) e o servidor (a notificação) chegam na mesma frase sem conversar. As favoritas aparecem duas
 * vezes por volta. A posição anda de 3 em 3 por dia (2 em 2 nas perguntas), qualquer que seja a quantidade
 * escolhida, para mudar de 1 para 3 por dia não embaralhar a fila. Frases e perguntas têm filas separadas.
 */
export function fraseDaVez(frases: MetanoiaFrase[], diaISO: string, horario = 0, tipo: MetanoiaTipo = "frase"): MetanoiaFrase | null {
  const aprovadas = frases.filter((f) => f.status === "aprovada" && f.tipo === tipo).sort((a, b) => a.id.localeCompare(b.id));
  if (!aprovadas.length) return null;
  const fila = [...aprovadas, ...aprovadas.filter((f) => f.favorita)];
  const porDia = tipo === "pergunta" ? MAX_PERGUNTAS_POR_DIA : MAX_FRASES_POR_DIA;
  const posicao = diaNumero(diaISO) * porDia + horario;
  return fila[((posicao % fila.length) + fila.length) % fila.length];
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
