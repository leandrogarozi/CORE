"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { AttachmentsButton } from "./AttachmentsButton";
import { TimerButton } from "./TimerButton";
import { StatusPicker } from "./StatusPicker";
import { MinutesPicker, TimePicker } from "./TimePicker";
import { ReminderDateButton } from "./RemindersView";
import { CommentButton } from "./CommentButton";
import { BellIcon, BoltIcon, CommentIcon, DragGripIcon, DuplicateIcon, FlagIcon, FolderIcon, RepeatIcon, TrashIcon, UsersGroupIcon } from "./icons";
import { todayISO } from "@/lib/date-utils";
import { countOpenChecklistItems } from "@/lib/rich-text";
import { CATEGORY_LABEL, isMeetingTask, type Category, type Priority, type Repeat, type Task } from "@/lib/types";
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

function quickTitle(val: number) {
  if (val > 0) return `Velocidade ${val}/3 — clique num raio pra mudar, ou no mesmo pra tirar.`;
  return "Marcar velocidade de execução (1 a 3 raios)";
}

function QuickBolts({ value, onSet }: { value: number; onSet: (v: 0 | 1 | 2 | 3) => void }) {
  return (
    <div className="quick-bolts" title={quickTitle(value)}>
      {([1, 2, 3] as const).map((n) => (
        <button
          key={n}
          type="button"
          className={"quick-bolt" + (n <= value ? " filled" : "")}
          aria-label={`Velocidade ${n}`}
          onClick={(e) => {
            e.stopPropagation();
            onSet(n === value ? 0 : n);
          }}
        >
          <BoltIcon filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

function CategoryMenu({
  anchorRect,
  current,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  current: Category;
  onSelect: (c: Category) => void;
  onClose: () => void;
}) {
  const { board } = useBoardCtx();
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onClose]);

  return createPortal(
    <div className="status-menu" ref={ref} style={{ top: pos.top, left: pos.left }}>
      {CATEGORIES.map((c) => {
        const cfg = board.state.settings.tagColors[c];
        return (
          <button
            type="button"
            key={c}
            className={"status-menu-item" + (c === current ? " active" : "")}
            onClick={() => {
              onSelect(c);
              onClose();
            }}
          >
            <span className="status-menu-dot" style={{ background: cfg.hex }} />
            {CATEGORY_LABEL[c]}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

export function CategoryChip({
  category,
  onSelect,
}: {
  category: Category;
  onSelect?: (c: Category) => void;
}) {
  const { board } = useBoardCtx();
  const cfg = board.state.settings.tagColors[category];
  const style = { background: hexToRgba(cfg.hex, cfg.alpha), color: cfg.hex };
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  if (!onSelect) {
    return (
      <span className="chip" style={style}>
        {CATEGORY_LABEL[category]}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="chip chip-btn"
        style={style}
        title="Clique pra trocar a categoria"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorRect(anchorRect ? null : e.currentTarget.getBoundingClientRect());
        }}
      >
        {CATEGORY_LABEL[category]}
      </button>
      {anchorRect && (
        <CategoryMenu
          anchorRect={anchorRect}
          current={category}
          onSelect={onSelect}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
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

export function priorityColor(p: Priority) {
  return p === "alta" ? "var(--flag-alta)" : p === "media" ? "var(--flag-media)" : "var(--flag-baixa)";
}

export function priorityLabel(p: Priority) {
  return p === "alta" ? "Alta prioridade" : p === "media" ? "Média prioridade" : "Baixa prioridade";
}

export function nextPriority(p: Priority): Priority {
  if (p === "media") return "alta";
  if (p === "alta") return "baixa";
  return "media";
}

interface TaskRowProps {
  task: Task;
  draggable: boolean;
  onDragStart?: (id: string) => void;
  onDragOverRow?: (id: string) => void;
  onDrop?: () => void;
  dragging?: boolean;
  gridTemplate: string;
  position?: number; // quando definido, mostra 1/2/3... no lugar dos pontinhos de arrastar (ex.: etapas de um Projeto)
}

export function TaskRow({ task: t, draggable, onDragStart, onDragOverRow, onDrop, dragging, gridTemplate, position }: TaskRowProps) {
  const { board, askScope, askConfirm, openProject, focusRequest, consumeFocusRequest } = useBoardCtx();
  const [editing, setEditing] = useState(false);
  const hasReminder = board.state.reminders.some((r) => r.taskId === t.id);
  const openPautas = isMeetingTask(t) ? countOpenChecklistItems(t.note) : 0;

  useEffect(() => {
    if (focusRequest?.kind === "task" && focusRequest.id === t.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reagindo a um pedido de foco vindo da busca (sistema externo)
      setEditing(true);
      consumeFocusRequest("task", t.id);
    }
  }, [focusRequest, consumeFocusRequest, t.id]);

  useEffect(() => {
    if (!editing) return;
    document.querySelector(`[data-id="${t.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [editing, t.id]);

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
    } else if (t.projectId) {
      const project = board.state.projects.find((p) => p.id === t.projectId);
      askConfirm(
        `Essa tarefa está dentro do projeto "${project?.name ?? "sem nome"}". Tem certeza que deseja apagá-la?`,
        () => doDelete(null),
        <FolderIcon />
      );
    } else {
      askConfirm(`Excluir a tarefa "${t.title}"? Essa ação não pode ser desfeita.`, () => doDelete(null));
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
      <span className="row-lead-cell">
        {position !== undefined ? (
          <span className="task-row-order" title="Arraste pra reordenar">
            <DragGripIcon />
            <span className="task-row-order-num mono">{position}</span>
          </span>
        ) : (
          <span className={"drag-handle" + (draggable ? "" : " disabled")} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} />
            ))}
          </span>
        )}
        {t.projectId && (
          <button
            type="button"
            className="task-project-folder"
            title="Tarefa de um projeto — clique pra abrir o projeto"
            onClick={(e) => {
              e.stopPropagation();
              openProject(t.projectId!);
            }}
          >
            <FolderIcon filled />
          </button>
        )}
      </span>
      <StatusPicker
        statuses={board.state.taskStatuses}
        currentId={t.statusId}
        onSelect={(statusId) => board.setTaskStatus(t.id, statusId)}
      />
      <QuickBolts value={t.quick || 0} onSet={(v) => board.setQuick(t.id, v)} />
      <div className="row-desc-cell">
        <button type="button" className="row-title" title={t.title} onClick={() => setEditing(true)}>
          {t.title}
        </button>
        {(openPautas > 0 || hasReminder || t.note.trim()) && (
          <span className="row-badges">
            {openPautas > 0 && (
              <span className="task-badge task-pautas-badge" title={`${openPautas} pauta(s) em aberto nessa reunião`}>
                <UsersGroupIcon /> {openPautas}
              </span>
            )}
            {hasReminder && (
              <span className="task-badge task-reminder-badge" title="Tarefa com lembrete">
                <BellIcon filled />
              </span>
            )}
            {t.note.trim() && (
              <span className="task-badge task-note-badge" title="Observação na tarefa">
                <CommentIcon />
              </span>
            )}
          </span>
        )}
        {t.time && <span className="row-time mono">{t.time}</span>}
      </div>
      <div className="row-category-cell">
        {t.seriesId && (
          <span className="flag" title="Tarefa recorrente">
            <RepeatIcon />
          </span>
        )}
        <CategoryChip category={t.category} onSelect={(c) => board.setCategory(t.id, c)} />
        {t.category2 && <CategoryChip category={t.category2} />}
      </div>
      <button
        type="button"
        className="flag flag-btn"
        title={`${priorityLabel(t.priority)} — clique pra mudar`}
        onClick={(e) => {
          e.stopPropagation();
          board.setPriority(t.id, nextPriority(t.priority));
        }}
      >
        <FlagIcon color={priorityColor(t.priority)} />
      </button>
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
  const linkedReminder = board.state.reminders.find((r) => r.taskId === t.id) ?? null;
  const clientListId = useId();
  const clientOptions = Array.from(
    new Set(board.state.tasks.filter((x) => isMeetingTask(x) && x.client).map((x) => x.client as string))
  ).sort();
  const [vals, setVals] = useState<TaskEditFields>({
    title: t.title,
    category: t.category,
    category2: t.category2,
    priority: t.priority,
    date: t.date,
    time: t.time,
    durationMin: t.durationMin,
    note: t.note,
    repeat: currentSeries ? currentSeries.repeat : "none",
    projectId: t.projectId,
    client: t.client,
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
        <label className="edit-field">
          <span className="edit-field-label">Categoria</span>
          <select
            value={vals.category}
            onChange={(e) => {
              const category = e.target.value as Category;
              setVals((v) => ({ ...v, category, category2: v.category2 === category ? null : v.category2 }));
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="edit-field">
          <span className="edit-field-label">2ª categoria</span>
          <select
            value={vals.category2 ?? ""}
            onChange={(e) => setVals((v) => ({ ...v, category2: (e.target.value || null) as Category | null }))}
          >
            <option value="">Nenhuma</option>
            {CATEGORIES.filter((c) => c !== vals.category).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        {isMeetingTask(vals) && (
          <label className="edit-field">
            <span className="edit-field-label">Cliente</span>
            <input
              type="text"
              list={clientListId}
              value={vals.client ?? ""}
              placeholder="Nome do cliente"
              onChange={(e) => setVals((v) => ({ ...v, client: e.target.value || null }))}
            />
            <datalist id={clientListId}>
              {clientOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        )}
        <label className="edit-field">
          <span className="edit-field-label">Prioridade</span>
          <select value={vals.priority} onChange={(e) => setVals((v) => ({ ...v, priority: e.target.value as Priority }))}>
            {PRIORITIES.map((p) => (
              <option key={p.v} value={p.v}>
                {p.l}
              </option>
            ))}
          </select>
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Data</span>
          <input type="date" value={vals.date || ""} onChange={(e) => setVals((v) => ({ ...v, date: e.target.value || null }))} />
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Hora</span>
          <TimePicker value={vals.time} onChange={(v) => setVals((s) => ({ ...s, time: v }))} />
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Duração</span>
          <MinutesPicker
            minutes={vals.durationMin}
            onChange={(m) => setVals((v) => ({ ...v, durationMin: m }))}
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
        <label className="edit-field edit-field-wide">
          <span className="edit-field-label">Observação</span>
          <CommentButton
            variant="field"
            alwaysExpanded
            value={vals.note || null}
            placeholder="+ Observação — cole um texto ou escreva algo..."
            ariaLabel="Observação da tarefa"
            onSave={(text) => {
              board.updateTaskNote(t.id, text);
              setVals((v) => ({ ...v, note: text }));
            }}
          />
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Projeto</span>
          <select
            value={vals.projectId ?? ""}
            onChange={(e) => setVals((v) => ({ ...v, projectId: e.target.value || null }))}
          >
            <option value="">Sem projeto</option>
            {board.state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Lembrete</span>
          <ReminderDateButton
            date={linkedReminder?.date ?? null}
            time={linkedReminder?.time ?? null}
            repeat={linkedReminder?.repeat ?? "none"}
            weekDays={linkedReminder?.weekDays ?? null}
            alertMinutesBefore={linkedReminder?.alertMinutesBefore ?? null}
            onSave={(fields) => board.setTaskReminder(t.id, fields)}
            emptyLabel="Sem lembrete"
          />
        </label>
        <label className="edit-field">
          <span className="edit-field-label">Anexos</span>
          <AttachmentsButton entityType="task" entityId={t.id} ariaLabel="Anexos da tarefa" />
        </label>
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
