"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { TimerButton } from "./TimerButton";
import { StatusPicker } from "./StatusPicker";
import { DuplicateIcon, FlagIcon, RepeatIcon, TrashIcon } from "./icons";
import { todayISO } from "@/lib/date-utils";
import { CATEGORY_LABEL, type Category, type Priority, type Repeat, type Task } from "@/lib/types";
import type { TaskEditFields } from "@/lib/board/use-board";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
const PRIORITIES: { v: Priority; l: string }[] = [
  { v: "alta", l: "Alta" },
  { v: "media", l: "Média" },
  { v: "baixa", l: "Baixa" },
];
const REPEATS: { v: Repeat; l: string }[] = [
  { v: "none", l: "Não repete" },
  { v: "daily", l: "Todo dia" },
  { v: "weekly", l: "Toda semana" },
  { v: "monthly", l: "Mensalmente" },
  { v: "yearly", l: "Anualmente" },
];

function isOverdue(t: Task) {
  return !t.done && t.date && t.date < todayISO();
}

function quickLabel(val: number) {
  return val > 0 ? "+".repeat(val) : "+";
}

function quickTitle(val: number) {
  if (val === 3) return "+++ — bem rápida, dá pra limpar logo. Clique pra tirar a marcação.";
  if (val === 2) return "++ — rápida. Clique pra virar +++.";
  if (val === 1) return "+ — mais lenta pra executar. Clique pra virar ++.";
  return "Marcar velocidade de execução (clique: + → ++ → +++)";
}

export function CategoryChip({ category }: { category: Category }) {
  const { board } = useBoardCtx();
  const cfg = board.state.settings.tagColors[category];
  const style = { background: hexToRgba(cfg.hex, cfg.alpha), color: cfg.hex };
  return (
    <span className="chip" style={style}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.substring(0, 2), 16) || 153;
  const g = parseInt(full.substring(2, 4), 16) || 153;
  const b = parseInt(full.substring(4, 6), 16) || 153;
  return `rgba(${r},${g},${b},${alpha})`;
}

function priorityColor(p: Priority) {
  return p === "alta" ? "var(--flag-alta)" : p === "media" ? "var(--flag-media)" : "var(--flag-baixa)";
}

interface TaskRowProps {
  task: Task;
  draggable: boolean;
  onDragStart?: (id: string) => void;
  onDragOverRow?: (id: string) => void;
  onDrop?: () => void;
  dragging?: boolean;
  gridTemplate: string;
}

export function TaskRow({ task: t, draggable, onDragStart, onDragOverRow, onDrop, dragging, gridTemplate }: TaskRowProps) {
  const { board, askScope } = useBoardCtx();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <TaskEditRow task={t} onDone={() => setEditing(false)} />;
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    function doDelete(scope: "esta" | "proximas" | "todas" | null) {
      board.deleteTask(t.id, scope);
    }
    if (t.seriesId) {
      askScope("Essa tarefa faz parte de uma repetição. Apagar:", doDelete);
    } else {
      doDelete(null);
    }
  }

  return (
    <div
      className={"task-row" + (t.done ? " done" : "") + (isOverdue(t) ? " overdue" : "") + (dragging ? " dragging" : "")}
      style={{ gridTemplateColumns: gridTemplate }}
      draggable={draggable}
      data-id={t.id}
      onDragStart={() => onDragStart?.(t.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverRow?.(t.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
    >
      <span className={"drag-handle" + (draggable ? "" : " disabled")} aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} />
        ))}
      </span>
      <StatusPicker
        statuses={board.state.taskStatuses}
        currentId={t.statusId}
        onSelect={(statusId) => board.setTaskStatus(t.id, statusId)}
      />
      <button
        type="button"
        className={"quick-badge" + ((t.quick || 0) > 0 ? " set" : "")}
        title={quickTitle(t.quick || 0)}
        onClick={(e) => {
          e.stopPropagation();
          board.cycleQuick(t.id);
        }}
      >
        {quickLabel(t.quick || 0)}
      </button>
      <div className="row-desc-cell">
        <button type="button" className="row-title" title={t.title} onClick={() => setEditing(true)}>
          {t.title}
        </button>
        {t.time && <span className="row-time mono">{t.time}</span>}
      </div>
      <div className="row-category-cell">
        {t.seriesId && (
          <span className="flag" title="Tarefa recorrente">
            <RepeatIcon />
          </span>
        )}
        <CategoryChip category={t.category} />
      </div>
      <span
        className="flag"
        title={t.priority === "alta" ? "Alta prioridade" : t.priority === "media" ? "Média prioridade" : "Baixa prioridade"}
      >
        <FlagIcon color={priorityColor(t.priority)} />
      </span>
      <TimerButton kind="task" id={t.id} logDate={todayISO()} />
      <button
        className="icon-btn"
        type="button"
        title="Copiar tarefa"
        onClick={(e) => {
          e.stopPropagation();
          board.duplicateTask(t.id);
        }}
      >
        <DuplicateIcon />
      </button>
      <button className="icon-btn danger-hover" type="button" title="Excluir" onClick={handleDelete}>
        <TrashIcon />
      </button>
    </div>
  );
}

function TaskEditRow({ task: t, onDone }: { task: Task; onDone: () => void }) {
  const { board, askScope } = useBoardCtx();
  const currentSeries = t.seriesId ? board.state.taskSeries.find((s) => s.id === t.seriesId) : null;
  const [vals, setVals] = useState<TaskEditFields>({
    title: t.title,
    category: t.category,
    priority: t.priority,
    date: t.date,
    time: t.time,
    durationMin: t.durationMin,
    note: t.note,
    repeat: currentSeries ? currentSeries.repeat : "none",
  });

  function save() {
    const finalVals: TaskEditFields = { ...vals, title: vals.title.trim() || t.title, note: vals.note.trim() };
    onDone();
    function doApply(scope: "esta" | "proximas" | "todas" | null) {
      board.saveTaskEdit(t.id, finalVals, scope);
    }
    if (t.seriesId) {
      askScope("Essa tarefa faz parte de uma repetição. Aplicar a mudança em:", doApply);
    } else {
      doApply(null);
    }
  }

  return (
    <div className="edit-row" data-id={t.id}>
      <div className="edit-grid">
        <input
          type="text"
          value={vals.title}
          autoFocus
          onChange={(e) => setVals((v) => ({ ...v, title: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <select value={vals.category} onChange={(e) => setVals((v) => ({ ...v, category: e.target.value as Category }))}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select value={vals.priority} onChange={(e) => setVals((v) => ({ ...v, priority: e.target.value as Priority }))}>
          {PRIORITIES.map((p) => (
            <option key={p.v} value={p.v}>
              {p.l}
            </option>
          ))}
        </select>
        <input type="date" value={vals.date || ""} onChange={(e) => setVals((v) => ({ ...v, date: e.target.value || null }))} />
        <label className="edit-field">
          <span className="edit-field-label">Hora</span>
          <input type="time" value={vals.time} onChange={(e) => setVals((v) => ({ ...v, time: e.target.value }))} />
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Duração (min)</span>
          <input
            type="number"
            min={0}
            step={5}
            value={vals.durationMin ?? ""}
            placeholder="min"
            onChange={(e) => setVals((v) => ({ ...v, durationMin: e.target.value ? parseInt(e.target.value, 10) : null }))}
          />
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Repete</span>
          <select value={vals.repeat} onChange={(e) => setVals((v) => ({ ...v, repeat: e.target.value as Repeat }))}>
            {REPEATS.map((r) => (
              <option key={r.v} value={r.v}>
                {r.l}
              </option>
            ))}
          </select>
        </label>
        <input
          type="text"
          value={vals.note}
          placeholder="nota (opcional)"
          onChange={(e) => setVals((v) => ({ ...v, note: e.target.value }))}
        />
      </div>
      <div className="edit-actions">
        <button className="btn btn-ghost" type="button" onClick={onDone}>
          Cancelar
        </button>
        <button className="btn btn-accent" type="button" onClick={save}>
          Salvar
        </button>
      </div>
    </div>
  );
}
