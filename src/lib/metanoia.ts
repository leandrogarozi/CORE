import type { MetanoiaFrase, MetanoiaTipo } from "@/lib/types";

export const NOME_DA_METANOIA = "Metanoia";

/** Quantas frases por dia a pessoa pode pedir, e os horários que valem para cada quantidade. */
export const MAX_FRASES_POR_DIA = 3;
export const HORARIOS_PADRAO = ["09:00", "14:00", "20:00"];
/** Perguntas poderosas: até 2 por dia, em horários próprios (as frases não ocupam esses horários). */
export const MAX_PERGUNTAS_POR_DIA = 2;
export const HORARIOS_PERGUNTAS_PADRAO = ["12:00", "18:00"];

/** "Fulano — Fonte" para mostrar embaixo da frase. */
export function creditoDaFrase(f: Pick<MetanoiaFrase, "autor" | "fonte">): string {
  return [f.autor?.trim(), f.fonte?.trim()].filter(Boolean).join(" · ");
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

/** Os horários que valem agora: os primeiros `vezes` da lista, em ordem. */
export function horariosEmUso(vezes: number, horarios: string[]): string[] {
  const n = Math.min(MAX_FRASES_POR_DIA, Math.max(0, Math.round(vezes)));
  const lista = horarios.length ? horarios : HORARIOS_PADRAO;
  return lista.slice(0, n);
}

/** Igual a `horariosEmUso`, para as perguntas. */
export function horariosDePerguntasEmUso(vezes: number, horarios: string[]): string[] {
  const n = Math.min(MAX_PERGUNTAS_POR_DIA, Math.max(0, Math.round(vezes)));
  const lista = horarios.length ? horarios : HORARIOS_PERGUNTAS_PADRAO;
  return lista.slice(0, n);
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
