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
      // Measure the cell's actual rendered width (not the stored value) so a column
      // currently auto-filling leftover space (Descrição) doesn't jump on first drag.
      const cell = e.currentTarget.parentElement as HTMLElement | null;
      const startWidth = cell?.getBoundingClientRect().width ?? columns.widthFor(colKey);
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

  return (
    <span
      className="col-resize-handle"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.preventDefault();
        columns.resetColumnWidth(colKey);
      }}
      title="Arraste para redimensionar. Clique duas vezes para restaurar o tamanho padrão."
      aria-hidden="true"
    />
  );
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

  // Com "Rápidas primeiro" ligado, a posição das tarefas ⚡ é calculada pelo
  // número de raios — arrastar elas não teria efeito. As sem raio continuam
  // livres pra reordenar; a ordem delas é respeitada quando o botão é desligado.
  const canDrag = (t: Task) => !sortByQuick || (t.quick || 0) === 0;

  function resetDrag() {
    setDraggingId(null);
    setOverId(null);
  }

  function handleDrop() {
    if (!draggingId) return resetDrag();
    const dragged = tasks.find((t) => t.id === draggingId);
    if (!dragged || !canDrag(dragged)) return resetDrag();

    if (!sortByQuick) {
      const ids = items.map((t) => t.id);
      const fromIdx = ids.indexOf(draggingId);
      let toIdx = overId ? ids.indexOf(overId) : ids.length - 1;
      if (fromIdx === -1) return resetDrag();
      if (toIdx === -1) toIdx = ids.length - 1;
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, draggingId);
      board.reorderBucket(bucketKey, ids);
      return resetDrag();
    }

    // Modo "rápidas primeiro": mexe só na sequência das tarefas sem raio, mantendo
    // as ⚡ nas posições que já ocupavam na ordem real (senão o simples ato de
    // arrastar reescreveria a ordem manual de todo mundo pela ordem de exibição).
    const over = overId ? tasks.find((t) => t.id === overId) : null;
    if (over && !canDrag(over)) return resetDrag();

    const base = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
    const slots = base.map((t, i) => ({ t, i })).filter((s) => canDrag(s.t)).map((s) => s.i);
    const movable = slots.map((i) => base[i].id);
    const fromIdx = movable.indexOf(draggingId);
    let toIdx = over ? movable.indexOf(over.id) : movable.length - 1;
    if (fromIdx === -1) return resetDrag();
    if (toIdx === -1) toIdx = movable.length - 1;
    movable.splice(fromIdx, 1);
    movable.splice(toIdx, 0, draggingId);

    const ids = base.map((t) => t.id);
    slots.forEach((pos, k) => {
      ids[pos] = movable[k];
    });
    board.reorderBucket(bucketKey, ids);
    resetDrag();
  }

  async function handleAdd() {
    const title = inputVal.trim();
    if (!title) return;
    setInputVal("");
    const ok = await board.addTask(bucketKey, title);
    if (!ok) setInputVal(title);
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
          onBlur={handleAdd}
        />
      </div>
      {!items.length && <div className="empty-row">{emptyLabel}</div>}
      {items.length > 0 && (
        <div className="task-table-scroll">
          {showHeader && (
            <div className="task-list-header" style={{ gridTemplateColumns: columns.gridTemplate }}>
              <span />
              {TASK_COLUMNS.map((c) => (
                <span className={`tlh-cell tlh-col-${c.key}`} key={c.key}>
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
              draggable={canDrag(t)}
              dragging={draggingId === t.id}
              dropTarget={!!draggingId && overId === t.id && draggingId !== t.id && canDrag(t)}
              onDragStart={setDraggingId}
              onDragOverRow={setOverId}
              onDrop={handleDrop}
              onDragEnd={resetDrag}
              gridTemplate={columns.gridTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
