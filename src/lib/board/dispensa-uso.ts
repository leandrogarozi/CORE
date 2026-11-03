import type { PantryItem, PantryUsage } from "@/lib/types";

/**
 * Média de uso da Dispensa: a partir do histórico de mudanças de quantidade, quanto tempo cada produto dura.
 * Só conta "uso" (a quantidade diminuiu); "compra" (aumentou) marca recompra; "ajuste" é correção e fica de fora.
 * O primeiro uso não entra na conta: não se sabe há quanto tempo o produto vinha sendo gasto antes dele.
 * Só calcula com pelo menos 2 usos em 7 dias ou mais, para não chutar com pouco dado.
 */
export const MIN_USOS = 2;
export const MIN_DIAS = 7;

const DIA_MS = 86400000;

export type MediaDeUso =
  | { pronta: false; usos: number; diasObservados: number }
  | {
      pronta: true;
      usos: number;
      compras: number;
      diasObservados: number;
      porDia: number;
      porSemana: number;
      /** Do cheio ao fim. Em % é 100; nos outros, a maior quantidade já vista. */
      duracaoDoCheioDias: number;
      diasRestantes: number | null;
      acabaEm: string | null;
    };

const isoMaisDias = (hoje: string, dias: number) => {
  const d = new Date(hoje + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.ceil(dias));
  return d.toISOString().slice(0, 10);
};

export function mediaDeUso(item: Pick<PantryItem, "quantity" | "unit" | "status">, registros: PantryUsage[], hoje: string): MediaDeUso | null {
  const regs = registros.filter((r) => r.kind !== "ajuste").sort((a, b) => a.at.localeCompare(b.at));
  const usos = regs.filter((r) => r.kind === "uso");
  const compras = regs.filter((r) => r.kind === "compra").length;
  if (!usos.length) return compras ? { pronta: false, usos: 0, diasObservados: 0 } : null;
  const dias = (new Date(usos[usos.length - 1].at).getTime() - new Date(usos[0].at).getTime()) / DIA_MS;
  if (usos.length < MIN_USOS || dias < MIN_DIAS) return { pronta: false, usos: usos.length, diasObservados: Math.max(0, Math.floor(dias)) };
  const gasto = usos.slice(1).reduce((s, r) => s + (r.before - r.after), 0);
  if (gasto <= 0) return { pronta: false, usos: usos.length, diasObservados: Math.floor(dias) };
  const porDia = gasto / dias;
  const capacidade = item.unit === "%" ? 100 : Math.max(item.quantity, ...regs.map((r) => Math.max(r.before, r.after)));
  const restantes = item.quantity > 0 && item.status !== "out" ? item.quantity / porDia : null;
  return {
    pronta: true,
    usos: usos.length,
    compras,
    diasObservados: Math.floor(dias),
    porDia,
    porSemana: porDia * 7,
    duracaoDoCheioDias: capacidade / porDia,
    diasRestantes: restantes,
    acabaEm: restantes !== null ? isoMaisDias(hoje, restantes) : null,
  };
}

/** "~4 dias", "~3 semanas", "~2 meses". */
export function fmtTempo(dias: number): string {
  if (dias < 14) {
    const n = Math.max(1, Math.round(dias));
    return `~${n} ${n === 1 ? "dia" : "dias"}`;
  }
  if (dias < 70) return `~${Math.round(dias / 7)} semanas`;
  const m = Math.round((dias / 30.4) * 2) / 2;
  const txt = String(m).replace(".", ",");
  return `~${txt} ${m === 1 ? "mês" : "meses"}`;
}

const num = (n: number) => (n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10).replace(".", ","));
const dataCurta = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/** O quanto se gasta, na unidade do item: "8% por semana", "0,5 kg por semana". */
export function fmtRitmo(m: Extract<MediaDeUso, { pronta: true }>, unit: string): string {
  const u = unit === "%" ? "%" : unit ? ` ${unit}` : "";
  return m.porDia * 7 >= 1 || m.porDia * 30 < 1 ? `${num(m.porSemana)}${u} por semana` : `${num(m.porDia * 30)}${u} por mês`;
}

/** A linha pequena da lista. `urgente` pinta de vermelho quando falta uma semana ou menos. */
export function linhaDeUso(m: MediaDeUso | null, unit: string): { texto: string; urgente: boolean } | null {
  if (!m) return null;
  if (!m.pronta) return { texto: "ainda juntando dados", urgente: false };
  if (m.diasRestantes !== null && m.diasRestantes <= 7) {
    const u = unit === "%" ? "%" : unit ? ` ${unit}` : "";
    return { texto: `gasta ~${num(m.porDia)}${u} por dia · acaba em ${fmtTempo(m.diasRestantes)}`, urgente: true };
  }
  const dura = `dura ${fmtTempo(m.duracaoDoCheioDias)}`;
  return { texto: m.acabaEm ? `${dura} · acaba ~${dataCurta(m.acabaEm)}` : dura, urgente: false };
}
