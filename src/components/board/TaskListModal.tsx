"use client";

import { CategoryChip } from "./TaskRow";
import type { Task } from "@/lib/types";

function fmtShortDate(iso: string | null) {
  if (!iso) return "Sem data";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function TaskListModal({ title, tasks, onClose }: { title: string; tasks: Task[]; onClose: () => void }) {
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <span className="modal-count mono">{tasks.length}</span>
        </div>
        <div className="task-list-modal-body">
          {!tasks.length && <div className="empty-row">Nenhuma tarefa aqui.</div>}
          {tasks.map((t) => (
            <div className="task-list-modal-row" key={t.id}>
              <span className="task-list-modal-date mono">{fmtShortDate(t.date)}</span>
              <span className="task-list-modal-title">{t.title}</span>
              <CategoryChip category={t.category} />
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost scope-cancel" onClick={onClose}>
          Fechar
        </button>
      </div>
    </>
  );
}
