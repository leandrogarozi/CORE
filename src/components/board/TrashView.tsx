"use client";

import { useBoardCtx } from "./board-context";
import { TrashIcon } from "./icons";
import { fmtShortDate } from "@/lib/date-utils";
import type { Task } from "@/lib/types";

function TrashRow({ task }: { task: Task }) {
  const { board, askConfirm } = useBoardCtx();

  function purge() {
    askConfirm(`Excluir "${task.title}" de vez? Essa ação não pode ser desfeita.`, () => board.purgeTask(task.id));
  }

  return (
    <div className="trash-row">
      <div className="trash-row-info">
        <span className="trash-row-title">{task.title}</span>
        <span className="trash-row-date">
          {task.deletedAt ? `excluída em ${fmtShortDate(task.deletedAt.slice(0, 10))}` : ""}
        </span>
      </div>
      <div className="trash-row-actions">
        <button type="button" className="btn btn-ghost" onClick={() => board.restoreTask(task.id)}>
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
  const items = board.state.trashedTasks;

  function emptyTrash() {
    askConfirm(
      `Esvaziar a lixeira? ${items.length} ${items.length === 1 ? "item vai ser excluído" : "itens vão ser excluídos"} de vez, sem volta.`,
      () => items.forEach((t) => board.purgeTask(t.id))
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
        {items.length > 0 && (
          <div className="trash-toolbar">
            <span>
              {items.length} {items.length === 1 ? "item excluído" : "itens excluídos"}
            </span>
            <button type="button" className="btn btn-ghost danger-hover" onClick={emptyTrash}>
              <TrashIcon /> Esvaziar lixeira
            </button>
          </div>
        )}
        <div className="list-card">
          {items.length === 0 ? (
            <div className="hp-empty">Lixeira vazia.</div>
          ) : (
            items.map((t) => <TrashRow key={t.id} task={t} />)
          )}
        </div>
      </div>
    </div>
  );
}
