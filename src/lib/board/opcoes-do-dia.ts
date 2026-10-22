import { MOOD_EMOTIONS } from "@/lib/mood";
import type { OpcoesDoDia } from "@/lib/types";

/**
 * As opções do Registro do dia que ele cadastra em Configurações: as emoções do Humor
 * e os botões de água. Guardadas por usuário; sem nada guardado, valem as de fábrica.
 * As carinhas do humor (6) continuam fixas: elas alimentam o gráfico e a média do Dashboard.
 */
export const PASSOS_DE_AGUA_PADRAO = [200, 500];

export type Emocao = { v: string; label: string };

/** Lê o que veio do banco sem confiar no formato: descarta o que não for emoção ou número válido. */
export function lerOpcoesDoDia(valor: unknown): OpcoesDoDia | null {
  if (!valor || typeof valor !== "object") return null;
  const o = valor as { emotions?: unknown; waterSteps?: unknown };
  const emotions = Array.isArray(o.emotions)
    ? o.emotions.filter((e): e is Emocao => !!e && typeof (e as Emocao).v === "string" && typeof (e as Emocao).label === "string")
    : null;
  const waterSteps = Array.isArray(o.waterSteps)
    ? o.waterSteps.filter((n): n is number => typeof n === "number" && n > 0 && n <= 5000)
    : null;
  if (!emotions && !waterSteps) return null;
  return { emotions: emotions && emotions.length ? emotions : null, waterSteps: waterSteps && waterSteps.length ? waterSteps : null };
}

export function emocoesEmUso(o: OpcoesDoDia | null | undefined): Emocao[] {
  return o?.emotions && o.emotions.length ? o.emotions : MOOD_EMOTIONS.map((m) => ({ v: m.v, label: m.label }));
}

export function passosDeAgua(o: OpcoesDoDia | null | undefined): number[] {
  return o?.waterSteps && o.waterSteps.length ? o.waterSteps : PASSOS_DE_AGUA_PADRAO;
}

/** Nome mostrado de uma emoção já gravada num dia: a lista atual, a de fábrica, ou o próprio texto gravado. */
export function rotuloDaEmocao(v: string, o: OpcoesDoDia | null | undefined): string {
  const achada = emocoesEmUso(o).find((e) => e.v === v) ?? MOOD_EMOTIONS.find((e) => e.v === v);
  return achada?.label ?? v.replace(/_/g, " ");
}

/** O valor gravado a partir do nome digitado: minúsculo, sem acento, com "_" no lugar de espaço. */
export function valorDaEmocao(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
