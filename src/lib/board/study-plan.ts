import { isoAddDays } from "@/lib/date-utils";
import type { StudyPlan } from "@/lib/types";

// Dia da semana de uma data ISO, sem passar por Date local (que muda com o fuso
// e erraria o dia perto da meia-noite). 0 = domingo.
export function weekDayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Os dias de estudo dentro de um intervalo, só nos dias da semana escolhidos.
export function studyDatesInRange(fromISO: string, toISO: string, weekDays: number[]): string[] {
  if (!weekDays.length || fromISO > toISO) return [];
  const out: string[] = [];
  let cur = fromISO;
  // Trava de segurança: um prazo digitado errado (ano 2099) não pode travar a tela.
  for (let i = 0; cur <= toISO && i < 800; i++) {
    if (weekDays.includes(weekDayOf(cur))) out.push(cur);
    cur = isoAddDays(cur, 1);
  }
  return out;
}

export interface StudyPlanMath {
  totalMin: number;
  feitoMin: number;
  restanteMin: number;
  pctFeito: number;
  /** Dias de estudo que ainda existem entre hoje e o prazo. */
  diasAteOPrazo: number | null;
  /** Quanto precisa estudar por dia pra caber no prazo. O número que dá tamanho à montanha. */
  minPorDiaNoPrazo: number | null;
  /** Quantas sessões do tamanho escolhido ainda faltam. */
  sessoesRestantes: number;
  /** Quando termina mantendo o ritmo de uma sessão por dia de estudo. */
  terminaEm: string | null;
  /** No ritmo atual não dá pra cumprir o prazo. */
  naoCabeNoPrazo: boolean;
}

export function studyPlanMath(
  plan: Pick<StudyPlan, "totalMinutes" | "sessionMinutes" | "weekDays" | "deadline">,
  feitoMin: number,
  todayISO: string
): StudyPlanMath {
  const totalMin = plan.totalMinutes ?? 0;
  const restanteMin = Math.max(0, totalMin - feitoMin);
  const sessao = Math.max(1, plan.sessionMinutes);
  const pctFeito = totalMin > 0 ? Math.min(100, Math.round((feitoMin / totalMin) * 100)) : 0;
  const sessoesRestantes = Math.ceil(restanteMin / sessao);

  // Quando termina no ritmo de uma sessão por dia de estudo: pega os dias de
  // estudo daqui pra frente e conta até fechar o que falta.
  let terminaEm: string | null = null;
  if (sessoesRestantes > 0 && plan.weekDays.length) {
    // Horizonte de 2 anos: se não fecha nesse prazo, o ritmo não é o problema.
    const horizonte = studyDatesInRange(todayISO, isoAddDays(todayISO, 730), plan.weekDays);
    terminaEm = horizonte[sessoesRestantes - 1] ?? null;
  }

  let diasAteOPrazo: number | null = null;
  let minPorDiaNoPrazo: number | null = null;
  if (plan.deadline) {
    diasAteOPrazo = studyDatesInRange(todayISO, plan.deadline, plan.weekDays).length;
    minPorDiaNoPrazo = diasAteOPrazo > 0 ? Math.ceil(restanteMin / diasAteOPrazo) : null;
  }

  const naoCabeNoPrazo =
    plan.deadline !== null &&
    restanteMin > 0 &&
    (diasAteOPrazo === 0 || (terminaEm !== null && terminaEm > plan.deadline));

  return {
    totalMin,
    feitoMin,
    restanteMin,
    pctFeito,
    diasAteOPrazo,
    minPorDiaNoPrazo,
    sessoesRestantes,
    terminaEm,
    naoCabeNoPrazo,
  };
}
