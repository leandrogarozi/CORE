import { dateFromISO, isoAddDays, isoFromDate, mondayOf } from "@/lib/date-utils";
import { MESES } from "@/lib/board/aniversarios";

/**
 * Lista de Reuniões "por data": a mais recente em cima.
 *
 * Blocos: Próximas (as que ainda vão acontecer, a mais perto primeiro), Esta
 * semana, Semana passada, depois um bloco por mês, e Sem data no fim. Dentro de
 * cada bloco passado a mais recente vem primeiro.
 */
export interface ReuniaoOrdenavel {
  date: string | null;
  time: string;
}

export interface GrupoDeReunioes<T> {
  chave: string;
  rotulo: string;
  itens: T[];
}

function chaveDoGrupo(data: string | null, hojeISO: string): { chave: string; rotulo: string; peso: number } {
  if (!data) return { chave: "sem_data", rotulo: "Sem data", peso: -1 };
  if (data > hojeISO) return { chave: "proximas", rotulo: "Próximas", peso: 3_000_000 };
  const segundaDestaSemana = isoFromDate(mondayOf(dateFromISO(hojeISO)));
  if (data >= segundaDestaSemana) return { chave: "esta_semana", rotulo: "Esta semana", peso: 2_000_000 };
  const segundaPassada = isoAddDays(segundaDestaSemana, -7);
  if (data >= segundaPassada) return { chave: "semana_passada", rotulo: "Semana passada", peso: 1_999_999 };
  const [ano, mes] = data.split("-").map(Number);
  return { chave: `${ano}-${String(mes).padStart(2, "0")}`, rotulo: `${MESES[mes - 1]} de ${ano}`, peso: ano * 12 + mes };
}

export function agruparReunioes<T extends ReuniaoOrdenavel>(reunioes: T[], hojeISO: string): GrupoDeReunioes<T>[] {
  const mapa = new Map<string, { rotulo: string; peso: number; itens: T[] }>();
  for (const r of reunioes) {
    const g = chaveDoGrupo(r.date, hojeISO);
    if (!mapa.has(g.chave)) mapa.set(g.chave, { rotulo: g.rotulo, peso: g.peso, itens: [] });
    mapa.get(g.chave)!.itens.push(r);
  }
  const quando = (r: T) => `${r.date ?? ""} ${r.time || "00:00"}`;
  return [...mapa.entries()]
    .sort((a, b) => b[1].peso - a[1].peso)
    .map(([chave, g]) => ({
      chave,
      rotulo: g.rotulo,
      itens: [...g.itens].sort((a, b) => (chave === "proximas" ? quando(a).localeCompare(quando(b)) : quando(b).localeCompare(quando(a)))),
    }));
}

/** "15/10" para a frente do nome da reunião. */
export function dataDaReuniao(date: string | null): string {
  if (!date) return "--/--";
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}
