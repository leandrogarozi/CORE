"use client";

import { useBoardCtx } from "./board-context";
import { isMeetingTask } from "@/lib/types";

/**
 * A agenda do dia em ordem de horário.
 *
 * Existe por um motivo de layout e um de conteúdo. O de layout: o painel de
 * Horas é baixo e o Registro do dia é alto, então sobrava um vão embaixo do
 * Horas — "eu não gosto desse espaço vazio, o layout tem que estar sempre
 * preenchido". O de conteúdo: faltava mesmo a leitura do dia em ordem de
 * relógio. A lista de tarefas é ordenada por prioridade e arrastada à mão; os
 * lembretes moram noutra tela. Nenhuma das duas responde "o que vem agora".
 *
 * Só entra o que TEM horário. Item sem hora não tem lugar numa linha do tempo,
 * e enfiá-lo no topo ou no fim inventaria uma ordem que ninguém decidiu — ele
 * continua na lista de tarefas, que é onde essas coisas vivem.
 */
export function DayAgendaPanel({ selectedDate }: { selectedDate: string }) {
  const { board } = useBoardCtx();

  const tarefas = board.state.tasks
    .filter((t) => t.date === selectedDate && t.time)
    .map((t) => ({
      id: t.id,
      hora: t.time,
      titulo: t.title,
      tipo: isMeetingTask(t) ? ("reuniao" as const) : ("tarefa" as const),
      feito: t.done,
    }));

  const lembretes = board.state.reminders
    .filter((r) => !r.deletedAt && !r.done && r.date === selectedDate && r.time)
    .map((r) => ({
      id: r.id,
      hora: r.time as string,
      titulo: r.title,
      tipo: "lembrete" as const,
      feito: false,
    }));

  const itens = [...tarefas, ...lembretes].sort((a, b) => a.hora.localeCompare(b.hora));

  return (
    <div className="section agenda-section">
      <div className="section-head">
        <span className="section-pill accent">Agenda do dia</span>
      </div>
      <div className="agenda-panel">
        {itens.length === 0 ? (
          // Vazio aqui é informação, não falha: saber que o dia não tem nada
          // marcado vale tanto quanto ver a lista cheia.
          <div className="agenda-vazio">Nada com horário marcado nesse dia.</div>
        ) : (
          itens.map((i) => (
            <div className={"agenda-row" + (i.feito ? " feito" : "")} key={`${i.tipo}-${i.id}`}>
              <span className="mono agenda-hora">{i.hora}</span>
              <span className={"agenda-marca " + i.tipo} />
              <span className="agenda-titulo">{i.titulo}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
