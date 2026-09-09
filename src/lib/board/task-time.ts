import type { BoardState, Category } from "@/lib/types";

type TimeState = Pick<BoardState, "tasks" | "taskTimeEntries">;

export interface TaskTimeBreakdown {
  total: number; // minutos
  byCategory: Partial<Record<Category, number>>;
  loggedMin: number; // veio do tempo por dia (cronômetro ou lançamento manual)
  typedMin: number; // veio da duração digitada de tarefa concluída sem tempo por dia
}

// Uma regra só de "quanto tempo de tarefa entrou nesse período", usada pelo
// Painel de Horas e pelo Dashboard. Se cada um tivesse a sua, os dois números
// do app discordariam entre si mais cedo ou mais tarde.
//
// Conta duas coisas, sem sobrepor:
//   1. O tempo lançado por dia, esteja a tarefa concluída ou não — foi trabalho
//      feito naquele dia, e é justamente o que se perdia quando a tarefa era
//      jogada pra outro dia sem ter terminado.
//   2. A duração digitada de tarefa concluída que NÃO tem nenhum tempo lançado,
//      pra continuar valendo o que já era contado antes de existir tempo por
//      dia. Tarefa com tempo lançado ignora a duração digitada: senão o mesmo
//      trabalho contaria duas vezes.
export function taskMinutesInRange(state: TimeState, fromISO: string, toISO: string): TaskTimeBreakdown {
  const taskById = new Map(state.tasks.map((t) => [t.id, t]));
  const comTempoLancado = new Set(state.taskTimeEntries.filter((e) => e.seconds > 0).map((e) => e.taskId));
  const byCategory: Partial<Record<Category, number>> = {};
  let loggedMin = 0;
  let typedMin = 0;

  function add(cat: Category, min: number) {
    byCategory[cat] = (byCategory[cat] || 0) + min;
  }

  for (const e of state.taskTimeEntries) {
    if (e.date < fromISO || e.date > toISO) continue;
    const t = taskById.get(e.taskId);
    if (!t) continue; // tarefa na Lixeira: o tempo dela sai dos relatórios junto
    const min = Math.round(e.seconds / 60);
    if (min <= 0) continue;
    loggedMin += min;
    add(t.category, min);
  }

  for (const t of state.tasks) {
    if (!t.done || !t.durationMin) continue;
    if (!t.date || t.date < fromISO || t.date > toISO) continue;
    if (comTempoLancado.has(t.id)) continue;
    typedMin += t.durationMin;
    add(t.category, t.durationMin);
  }

  return { total: loggedMin + typedMin, byCategory, loggedMin, typedMin };
}

// Tempo lançado numa tarefa num dia específico (segundos).
export function taskSecondsOnDay(state: TimeState, taskId: string, iso: string): number {
  return state.taskTimeEntries.find((e) => e.taskId === taskId && e.date === iso)?.seconds ?? 0;
}

// Os dias em que a tarefa teve tempo, do mais antigo pro mais recente.
export function taskEntriesOf(state: TimeState, taskId: string) {
  return state.taskTimeEntries
    .filter((e) => e.taskId === taskId)
    .sort((a, b) => a.date.localeCompare(b.date));
}
