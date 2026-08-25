"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { TaskRow } from "./TaskRow";
import type { Task } from "@/lib/types";

function sortForDisplay(list: Task[], sortByQuick: boolean): Task[] {
  const copy = [...list];
  if (sortByQuick) {
    copy.sort((a, b) => {
      const qa = a.quick || 0;
      const qb = b.quick || 0;
      if (qb !== qa) return qb - qa;
      return (a.order || 0) - (b.order || 0);
    });
  } else {
    copy.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return copy;
}

export function TaskListCard({
  bucketKey,
  tasks,
  emptyLabel,
  quickAddId,
  showHeader = true,
}: {
  bucketKey: string;
  tasks: Task[];
  emptyLabel: string;
  quickAddId: string;
  showHeader?: boolean;
}) {
  const { board, sortByQuick } = useBoardCtx();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const items = sortForDisplay(tasks, sortByQuick);
  const draggable = !sortByQuick;

  function handleDrop() {
    if (!draggingId) return;
    const ids = items.map((t) => t.id);
    const fromIdx = ids.indexOf(draggingId);
    let toIdx = overId ? ids.indexOf(overId) : ids.length - 1;
    if (fromIdx === -1) return;
    if (toIdx === -1) toIdx = ids.length - 1;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggingId);
    board.reorderBucket(bucketKey, ids);
    setDraggingId(null);
    setOverId(null);
  }

  function handleAdd() {
    const title = inputVal.trim();
    if (!title) return;
    board.addTask(bucketKey, title);
    setInputVal("");
  }

  return (
    <div className="task-list">
      <div className="quickadd-row">
        <span className="quickadd-plus" aria-hidden="true">
          +
        </span>
        <input
          id={quickAddId}
          type="text"
          className="quickadd-input"
          placeholder="+ Adicionar tarefa e pressionar Enter"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
      </div>
      {showHeader && items.length > 0 && (
        <div className="task-list-header">
          <span className="tlh-status">Status</span>
          <span className="tlh-quick">Velocidade</span>
          <span className="tlh-title">Descrição</span>
          <span className="tlh-meta">
            <span className="tlh-meta-item">Categoria</span>
            <span className="tlh-meta-item">Prioridade</span>
            <span className="tlh-meta-item">Play</span>
            <span className="tlh-meta-item">Duplicar</span>
            <span className="tlh-meta-item">Excluir</span>
          </span>
        </div>
      )}
      {!items.length && <div className="empty-row">{emptyLabel}</div>}
      {items.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          draggable={draggable}
          dragging={draggingId === t.id}
          onDragStart={setDraggingId}
          onDragOverRow={setOverId}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
