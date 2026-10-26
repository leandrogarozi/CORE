import type { MetanoiaFrase } from "@/lib/types";

export const NOME_DA_METANOIA = "Metanoia";

/** Quantas frases por dia a pessoa pode pedir, e os horários que valem para cada quantidade. */
export const MAX_FRASES_POR_DIA = 3;
export const HORARIOS_PADRAO = ["09:00", "14:00", "20:00"];

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
 * vezes por volta. A posição anda de 3 em 3 por dia, qualquer que seja a quantidade escolhida, para mudar de
 * 1 para 3 por dia não embaralhar a fila.
 */
export function fraseDaVez(frases: MetanoiaFrase[], diaISO: string, horario = 0): MetanoiaFrase | null {
  const aprovadas = frases.filter((f) => f.status === "aprovada").sort((a, b) => a.id.localeCompare(b.id));
  if (!aprovadas.length) return null;
  const fila = [...aprovadas, ...aprovadas.filter((f) => f.favorita)];
  const posicao = diaNumero(diaISO) * MAX_FRASES_POR_DIA + horario;
  return fila[((posicao % fila.length) + fila.length) % fila.length];
}

/** Os horários que valem agora: os primeiros `vezes` da lista, em ordem. */
export function horariosEmUso(vezes: number, horarios: string[]): string[] {
  const n = Math.min(MAX_FRASES_POR_DIA, Math.max(0, Math.round(vezes)));
  const lista = horarios.length ? horarios : HORARIOS_PADRAO;
  return lista.slice(0, n);
}
