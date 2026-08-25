"use client";

import { useCallback, useState } from "react";
import { useBoardCtx } from "./board-context";
import { TaskRow } from "./TaskRow";
import { TASK_COLUMNS, type ColumnKey } from "@/lib/board/column-widths";
import type { Task } from "@/lib/types";

function ColResizeHandle({ colKey }: { colKey: ColumnKey }) {
  const { columns } = useBoardCtx();

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columns.widthFor(colKey);
      function onMove(ev: PointerEvent) {
        columns.setColumnWidth(colKey, startWidth + (ev.clientX - startX));
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [columns, colKey]
  );

  return <span className="col-resize-handle" onPointerDown={onPointerDown} aria-hidden="true" />;
}

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
  const { board, sortByQuick, columns } = useBoardCtx();
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
      {!items.length && <div className="empty-row">{emptyLabel}</div>}
      {items.length > 0 && (
        <div className="task-table-scroll">
          {showHeader && (
            <div className="task-list-header" style={{ gridTemplateColumns: columns.gridTemplate }}>
              <span />
              {TASK_COLUMNS.map((c) => (
                <span className="tlh-cell" key={c.key}>
                  {c.label}
                  <ColResizeHandle colKey={c.key} />
                </span>
              ))}
            </div>
          )}
          {items.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              draggable={draggable}
              dragging={draggingId === t.id}
              onDragStart={setDraggingId}
              onDragOverRow={setOverId}
              onDrop={handleDrop}
              gridTemplate={columns.gridTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
