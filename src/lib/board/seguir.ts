import type { Task } from "@/lib/types";

/**
 * "Rastrear": a tarefa aberta que ficou pra trás passa pra hoje, todo dia,
 * inclusive sábado e domingo (não existe regra de dia útil aqui).
 *
 * Tarefa DESAFIADORA nunca rastreia: mudar a data dela sem perguntar é o
 * contrário do que a marcação de desafio quer. O banco recusa a combinação
 * (constraint tasks_desafiadora_nao_segue) e o job do pg_cron também a ignora.
 *
 * É o mesmo gesto do job faro_jobs.rolar_tarefas_que_seguem, feito na tela para
 * ela não ficar com o dia de ontem quando o app passa a noite aberto.
 */
export function tarefaSegue(t: Task, hoje: string): boolean {
  return t.follows && !t.challenging && !t.done && !t.deletedAt && !!t.date && t.date < hoje;
}

export function rolarTarefasQueSeguem(tasks: Task[], hoje: string): { tasks: Task[]; movidas: Task[] } {
  const movidas = tasks.filter((t) => tarefaSegue(t, hoje));
  if (!movidas.length) return { tasks, movidas };
  const ids = new Set(movidas.map((t) => t.id));
  return {
    // Término anterior ao novo dia não faz sentido: some em vez de ficar antes do começo.
    tasks: tasks.map((t) =>
      ids.has(t.id) ? { ...t, date: hoje, endDate: t.endDate && t.endDate < hoje ? null : t.endDate } : t
    ),
    movidas,
  };
}
