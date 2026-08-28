"use client";

import { useBoardCtx } from "./board-context";
import { TrashIcon } from "./icons";
import { fmtShortDate } from "@/lib/date-utils";

function TrashRow({
  title,
  deletedAt,
  onRestore,
  onPurge,
}: {
  title: string;
  deletedAt: string | null;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const { askConfirm } = useBoardCtx();

  function purge() {
    askConfirm(`Excluir "${title}" de vez? Essa ação não pode ser desfeita.`, onPurge);
  }

  return (
    <div className="trash-row">
      <div className="trash-row-info">
        <span className="trash-row-title">{title}</span>
        <span className="trash-row-date">{deletedAt ? `excluído em ${fmtShortDate(deletedAt.slice(0, 10))}` : ""}</span>
      </div>
      <div className="trash-row-actions">
        <button type="button" className="btn btn-ghost" onClick={onRestore}>
          Restaurar
        </button>
        <button type="button" className="icon-btn danger-hover" title="Excluir de vez" onClick={purge}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export function TrashView({ onBack }: { onBack: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const tasks = board.state.trashedTasks;
  const reminders = board.state.trashedReminders;
  const total = tasks.length + reminders.length;

  function emptyTrash() {
    askConfirm(
      `Esvaziar a lixeira? ${total} ${total === 1 ? "item vai ser excluído" : "itens vão ser excluídos"} de vez, sem volta.`,
      () => {
        tasks.forEach((t) => board.purgeTask(t.id));
        reminders.forEach((r) => board.purgeReminder(r.id));
      }
    );
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Lixeira</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list">
        {total > 0 && (
          <div className="trash-toolbar">
            <span>
              {total} {total === 1 ? "item excluído" : "itens excluídos"}
            </span>
            <button type="button" className="btn btn-ghost danger-hover" onClick={emptyTrash}>
              <TrashIcon /> Esvaziar lixeira
            </button>
          </div>
        )}
        <div className="list-card">
          {total === 0 ? (
            <div className="hp-empty">Lixeira vazia.</div>
          ) : (
            <>
              {tasks.map((t) => (
                <TrashRow
                  key={`task-${t.id}`}
                  title={t.title}
                  deletedAt={t.deletedAt}
                  onRestore={() => board.restoreTask(t.id)}
                  onPurge={() => board.purgeTask(t.id)}
                />
              ))}
              {reminders.map((r) => (
                <TrashRow
                  key={`reminder-${r.id}`}
                  title={r.title}
                  deletedAt={r.deletedAt}
                  onRestore={() => board.restoreReminder(r.id)}
                  onPurge={() => board.purgeReminder(r.id)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
