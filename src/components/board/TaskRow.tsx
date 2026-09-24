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
import { NoteField } from "./NoteField";
import {
  BellIcon,
  BoltIcon,
  ClockIcon,
  CommentIcon,
  DragGripIcon,
  DuplicateIcon,
  EraserIcon,
  FlagIcon,
  ChecklistIcon,
  CheckIcon,
  FolderIcon,
  HashIcon,
  PaperclipIcon,
  PlayCircleIcon,
  CalendarCheckIcon,
  ChevronIcon,
  RepeatIcon,
  ShieldWarningIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  UsersGroupIcon,
  WarningIcon,
  WeekIcon,
} from "./icons";
import { fmtDayMonth, fmtHM, todayISO } from "@/lib/date-utils";
import { taskEntriesOf } from "@/lib/board/task-time";
import { PostponeModal } from "./PostponeModal";
import { ToggleSwitch } from "./ToggleSwitch";
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

// Alterna a categoria clicada: se já era a 1ª ou 2ª, tira (promovendo a 2ª pra
// 1ª quando a 1ª sai); se não tinha nenhuma, vira a 1ª; se já tinha as duas,
// substitui a 2ª pela nova escolha.
function categoryToggleResult(
  category: Category,
  category2: Category | null,
  c: Category
): { category: Category; category2: Category | null } {
  if (category === c) return { category: category2 ?? "sem_categoria", category2: null };
  if (category2 === c) return { category, category2: null };
  if (category === "sem_categoria") return { category: c, category2: null };
  return { category, category2: c };
}

function CategoryMenu({
  anchorRect,
  category,
  category2,
  onToggle,
  onClose,
}: {
  anchorRect: DOMRect;
  category: Category;
  category2: Category | null;
  onToggle: (c: Category) => void;
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
      {CATEGORIES.filter((c) => c !== "sem_categoria").map((c) => {
        const cfg = board.state.settings.tagColors[c];
        const order = c === category ? 1 : c === category2 ? 2 : null;
        return (
          <button
            type="button"
            key={c}
            className={"status-menu-item" + (order ? " active" : "")}
            onClick={() => onToggle(c)}
          >
            <span className="status-menu-dot" style={{ background: cfg.hex }} />
            {CATEGORY_LABEL[c]}
            {order && <span className="category-order-badge">{order}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

function CategoryChipVisual({ category }: { category: Category }) {
  const { board } = useBoardCtx();
  if (category === "sem_categoria") {
    return (
      <span className="chip chip-warning">
        <WarningIcon /> Sem categoria
      </span>
    );
  }
  const cfg = board.state.settings.tagColors[category];
  const style = { background: hexToRgba(cfg.hex, cfg.alpha), color: cfg.hex };
  return (
    <span className="chip" style={style}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

export function CategoryChip({ category }: { category: Category }) {
  return <CategoryChipVisual category={category} />;
}

// Escolha de até 2 categorias num clique só: abre um menu com todas, marcando
// 1/2 conforme a ordem escolhida — usado na linha compacta e na edição.
export function CategoryPicker({
  category,
  category2,
  onChange,
}: {
  category: Category;
  category2: Category | null;
  onChange: (category: Category, category2: Category | null) => void;
}) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function toggle(c: Category) {
    const next = categoryToggleResult(category, category2, c);
    onChange(next.category, next.category2);
  }

  return (
    <>
      <button
        type="button"
        className="category-picker-btn"
        title="Categorias (até 2) — clique pra escolher"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorRect(anchorRect ? null : e.currentTarget.getBoundingClientRect());
        }}
      >
        <CategoryChipVisual category={category} />
        {category2 && <CategoryChipVisual category={category2} />}
      </button>
      {anchorRect && (
        <CategoryMenu
          anchorRect={anchorRect}
          category={category}
          category2={category2}
          onToggle={toggle}
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
  onDragEnd?: () => void;
  dragging?: boolean;
  dropTarget?: boolean;
  gridTemplate: string;
  position?: number; // quando definido, mostra 1/2/3... no lugar dos pontinhos de arrastar (ex.: etapas de um Projeto)
}

export function TaskRow({
  task: t,
  draggable,
  onDragStart,
  onDragOverRow,
  onDrop,
  onDragEnd,
  dragging,
  dropTarget,
  gridTemplate,
  position,
}: TaskRowProps) {
  const { board, askScope, askConfirm, openProject, focusRequest, consumeFocusRequest } = useBoardCtx();
  const [editing, setEditing] = useState(false);
  const hasReminder = board.state.reminders.some((r) => r.taskId === t.id);
  const hasAttachment = board.state.attachmentKeys.has(`task:${t.id}`);
  // Tópico em aberto é caixinha não marcada na observação — vale pra qualquer
  // tarefa, não só reunião (antes só reunião mostrava o selo).
  const openTopics = countOpenChecklistItems(t.note);
  const isMeeting = isMeetingTask(t);
  const adiamentos = board.state.taskPostponements.filter((p) => p.taskId === t.id).length;

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
      className={
        "task-row" +
        (t.done ? " done" : "") +
        (t.challenging && !t.done ? " challenging" : "") +
        (t.isEvent && !t.done ? " is-event" : "") +
        (isOverdue(t) ? " overdue" : "") +
        (dragging ? " dragging" : "") +
        (dropTarget ? " drop-target" : "")
      }
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
      onDragEnd={() => onDragEnd?.()}
    >
      <span className="row-lead-cell">
        {position !== undefined ? (
          <span className="task-row-order" title="Arraste pra reordenar">
            <DragGripIcon />
            <span className="task-row-order-num mono">{position}</span>
          </span>
        ) : (
          <span
            className={"drag-handle" + (draggable ? "" : " disabled")}
            title={
              draggable
                ? "Arraste pra reordenar"
                : "Com \u26a1 Rápidas primeiro ligado, a posição das tarefas com raio vem dos raios — as sem raio continuam livres pra arrastar"
            }
          >
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
        {(t.isEvent || t.client || t.challenging || openTopics > 0 || hasReminder || t.note.trim() || hasAttachment) && (
          <span className="row-badges">
            {/* Só o ícone: o horário já aparece do lado do sininho, e repetir
                o mesmo 15:00 duas vezes na linha é ruído. */}
            {t.isEvent && (
              <span className="task-badge task-event-badge" title="Evento — compromisso com hora marcada">
                <CalendarCheckIcon />
              </span>
            )}
            {t.client && (
              <span className="task-badge task-client-badge" title={`Cliente: ${t.client}`}>
                <UserIcon />
                <span className="task-client-name">{t.client}</span>
              </span>
            )}
            {t.challenging && (
              <span
                className="task-badge task-challenging-badge"
                title={
                  adiamentos > 0
                    ? `Tarefa desafiadora — já adiada ${adiamentos}x`
                    : "Tarefa desafiadora — dessa você não corre"
                }
              >
                <ShieldWarningIcon />
                {adiamentos > 0 ? ` ${adiamentos}x` : ""}
              </span>
            )}
            {openTopics > 0 && (
              <span
                className="task-badge task-pautas-badge"
                title={
                  isMeeting
                    ? `${openTopics} pauta(s) em aberto nessa reunião`
                    : `${openTopics} tópico(s) em aberto nessa tarefa`
                }
              >
                {isMeeting ? <UsersGroupIcon /> : <ChecklistIcon />} {openTopics}
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
            {hasAttachment && (
              <span className="task-badge task-attachment-badge" title="Tarefa com anexo">
                <PaperclipIcon />
              </span>
            )}
          </span>
        )}
        {t.time && <span className="row-time mono">{t.time}</span>}
        {(t.endDate || t.endTime) && (
          <span className="row-time mono row-end-range" title="Data/hora de término">
            → {t.endDate && t.endDate !== t.date ? fmtDayMonth(t.endDate) : ""}
            {t.endTime ? ` ${t.endTime}` : ""}
          </span>
        )}
      </div>
      <div className="row-category-cell">
        {t.seriesId && (
          <span className="flag" title="Tarefa recorrente">
            <RepeatIcon />
          </span>
        )}
        <CategoryPicker
          category={t.category}
          category2={t.category2}
          onChange={(category, category2) => board.setCategory(t.id, category, category2)}
        />
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

interface TaskWhenFields {
  date: string | null;
  time: string;
  endDate: string | null;
  endTime: string | null;
}

// Um menu só pro "quando" da tarefa: início (data + hora) e fim (data + hora)
// juntos, em vez de 4 campos soltos espalhados pelo formulário.
function TaskWhenButton({ date, time, endDate, endTime, onSave }: TaskWhenFields & { onSave: (f: TaskWhenFields) => void }) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const open = anchorRect !== null;
  const [dateDraft, setDateDraft] = useState(date ?? "");
  const [timeDraft, setTimeDraft] = useState(time ?? "");
  const [endDateDraft, setEndDateDraft] = useState(endDate ?? "");
  const [endTimeDraft, setEndTimeDraft] = useState(endTime ?? "");
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.(".time-picker-pop")) return;
      setAnchorRect(null);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      setAnchorRect(null);
      return;
    }
    setDateDraft(date ?? "");
    setTimeDraft(time ?? "");
    setEndDateDraft(endDate ?? "");
    setEndTimeDraft(endTime ?? "");
    if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
  }

  function save() {
    onSave({
      date: dateDraft || null,
      time: timeDraft,
      endDate: endDateDraft || null,
      endTime: endTimeDraft || null,
    });
    setAnchorRect(null);
  }

  function clearAll() {
    setDateDraft("");
    setTimeDraft("");
    setEndDateDraft("");
    setEndTimeDraft("");
  }

  const startLabel = date ? fmtDayMonth(date) + (time ? ` às ${time}` : "") : null;
  const endLabel = endDate || endTime
    ? `${endDate && endDate !== date ? fmtDayMonth(endDate) : ""}${endTime ? ` ${endTime}` : ""}`.trim()
    : null;
  const label = [startLabel, endLabel ? `até ${endLabel}` : null].filter(Boolean).join(" · ") || null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"reminder-date-btn" + (label ? " has-date" : "")}
        title={label ?? "Definir data e horário"}
        onClick={toggleOpen}
      >
        <WeekIcon />
        <span className={label ? undefined : "reminder-date-empty"}>{label ?? "Sem data"}</span>
      </button>
      {open &&
        createPortal(
          <div className="daylog-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <div className="edit-field">
              <span className="edit-field-label">Início</span>
              <div className="reminder-datetime-row">
                <input
                  type="date"
                  autoFocus
                  value={dateDraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setAnchorRect(null)}
                />
                <TimePicker value={timeDraft} onChange={setTimeDraft} onClear={() => setTimeDraft("")} />
                <button
                  type="button"
                  className="icon-btn reminder-clear-btn"
                  disabled={!dateDraft && !timeDraft}
                  title="Limpar início"
                  onClick={() => {
                    setDateDraft("");
                    setTimeDraft("");
                  }}
                >
                  <EraserIcon />
                </button>
              </div>
            </div>
            <div className="edit-field">
              <span className="edit-field-label">Fim (opcional — evento que passa de um dia)</span>
              <div className="reminder-datetime-row">
                <input type="date" value={endDateDraft} onChange={(e) => setEndDateDraft(e.target.value)} />
                <TimePicker value={endTimeDraft} onChange={setEndTimeDraft} onClear={() => setEndTimeDraft("")} />
                <button
                  type="button"
                  className="icon-btn reminder-clear-btn"
                  disabled={!endDateDraft && !endTimeDraft}
                  title="Limpar fim"
                  onClick={() => {
                    setEndDateDraft("");
                    setEndTimeDraft("");
                  }}
                >
                  <EraserIcon />
                </button>
              </div>
            </div>
            <div className="edit-actions edit-actions-split">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!dateDraft && !timeDraft && !endDateDraft && !endTimeDraft}
                title="Limpar datas e horários"
                onClick={clearAll}
              >
                <EraserIcon /> Limpar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAnchorRect(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-accent" onClick={save}>
                Salvar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Uma linha da lista de tempo por dia. O campo de minutos guarda rascunho e só
// grava ao sair ou no Enter: gravar a cada tecla mandaria "1", "12" e "120" pro
// banco enquanto ele digita 120.
function TaskTimeDayRow({
  dateISO,
  seconds,
  onCommit,
}: {
  dateISO: string;
  seconds: number;
  onCommit: (minutes: number) => void;
}) {
  const minutes = Math.round(seconds / 60);
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const val = Math.round(Number(draft.replace(",", ".")));
    if (Number.isFinite(val) && val >= 0 && val !== minutes) onCommit(val);
    setDraft(null);
  }

  return (
    <div className="task-time-row">
      <span className="task-time-day mono">{fmtDayMonth(dateISO)}</span>
      <input
        type="number"
        min={0}
        className="budget-input task-time-min mono"
        value={draft ?? String(minutes)}
        aria-label={`Minutos em ${fmtDayMonth(dateISO)}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <span className="task-time-unit">min</span>
      <span className="task-time-hm mono">{fmtHM(minutes)}</span>
      <button
        type="button"
        className="icon-btn danger-hover"
        title="Apagar o tempo desse dia"
        onClick={() => onCommit(0)}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// Tempo trabalhado na tarefa, dia a dia. É a resposta pro caso de trabalhar
// hoje, não terminar e jogar a tarefa pra amanhã: cada dia guarda as suas
// horas, e mover a tarefa não mexe no que já passou.
function TaskTimeButton({ taskId }: { taskId: string }) {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [newDate, setNewDate] = useState(() => todayISO());
  const [newMinutes, setNewMinutes] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);
  const open = anchorRect !== null;

  const entries = taskEntriesOf(board.state, taskId);
  const totalMin = Math.round(entries.reduce((sum, e) => sum + e.seconds, 0) / 60);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setAnchorRect(null);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function lancar() {
    const min = Math.round(Number(newMinutes.replace(",", ".")));
    if (!newDate || !Number.isFinite(min) || min <= 0) return;
    // Soma no dia em vez de substituir: lançar 30min num dia que já tem 1h vira
    // 1h30, que é o que se espera de quem está registrando mais uma sessão.
    const atual = entries.find((e) => e.date === newDate);
    board.setTaskTimeMinutes(taskId, newDate, Math.round((atual?.seconds ?? 0) / 60) + min);
    setNewMinutes("");
  }

  const label = totalMin > 0 ? `${fmtHM(totalMin)} em ${entries.length} dia${entries.length > 1 ? "s" : ""}` : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"reminder-date-btn" + (label ? " has-date" : "")}
        title="Tempo trabalhado, dia a dia"
        onClick={() => setAnchorRect(anchorRect ? null : btnRef.current?.getBoundingClientRect() ?? null)}
      >
        <ClockIcon />
        <span className={label ? undefined : "reminder-date-empty"}>{label ?? "Nenhum tempo lançado"}</span>
      </button>
      {open &&
        createPortal(
          <div className="daylog-popover task-time-pop" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <span className="edit-field-label">Tempo por dia</span>
            {!entries.length && <div className="hp-empty">Nada lançado ainda.</div>}
            {entries.map((e) => (
              <TaskTimeDayRow
                key={e.id}
                dateISO={e.date}
                seconds={e.seconds}
                onCommit={(min) => board.setTaskTimeMinutes(taskId, e.date, min)}
              />
            ))}
            <div className="task-time-row task-time-add">
              <input
                type="date"
                className="task-time-date"
                value={newDate}
                aria-label="Dia do lançamento"
                onChange={(e) => setNewDate(e.target.value)}
              />
              <input
                type="number"
                min={0}
                className="budget-input task-time-min mono"
                placeholder="0"
                value={newMinutes}
                aria-label="Minutos a lançar"
                onChange={(e) => setNewMinutes(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lancar()}
              />
              <span className="task-time-unit">min</span>
              <button type="button" className="btn btn-accent task-time-add-btn" onClick={lancar}>
                Lançar
              </button>
            </div>
            {totalMin > 0 && (
              <div className="task-time-total">
                <span>Total</span>
                <strong className="mono">{fmtHM(totalMin)}</strong>
              </div>
            )}
            <div className="edit-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAnchorRect(null)}>
                Fechar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// O código curto da tarefa. Serve pra colar num lembrete ou numa anotação e
// depois achar a tarefa pela busca — por isso é só leitura (quem gera é a
// criação da tarefa) e fica selecionável, pra funcionar mesmo se o navegador
// negar a área de transferência.
function TaskCodeField({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!code) return <span className="task-code-empty">tarefa antiga, sem ID</span>;

  // Guardado em maiúscula no banco, mostrado e copiado em minúscula — é pra ser
  // discreto na tela. A busca compara sem diferenciar caixa, então tanto faz.
  const shown = code.toLowerCase();

  async function copy() {
    inputRef.current?.select();
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Sem permissão pra área de transferência: o texto fica selecionado pra
      // copiar pelo teclado.
    }
  }

  return (
    <span className="task-code-field">
      <input
        ref={inputRef}
        type="text"
        className="task-code-input mono"
        value={shown}
        readOnly
        aria-label="ID da tarefa"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        className={"icon-btn" + (copied ? " task-code-copied" : "")}
        title="Copiar o ID pra colar num lembrete ou numa anotação"
        onClick={copy}
      >
        {copied ? <CheckIcon /> : <DuplicateIcon />}
      </button>
      {copied && <span className="task-code-copied-hint">Copiado</span>}
    </span>
  );
}

function TaskEditRow({ task: t, onDone }: { task: Task; onDone: () => void }) {
  const { board, askScope } = useBoardCtx();
  const currentSeries = t.seriesId ? board.state.taskSeries.find((s) => s.id === t.seriesId) : null;
  const linkedReminder = board.state.reminders.find((r) => r.taskId === t.id) ?? null;
  const clientListId = useId();
  const clientOptions = Array.from(
    new Set(board.state.tasks.filter((x) => x.client).map((x) => x.client as string))
  ).sort();
  const [postponing, setPostponing] = useState<TaskEditFields | null>(null);
  const adiamentos = board.state.taskPostponements.filter((p) => p.taskId === t.id).length;
  const [vals, setVals] = useState<TaskEditFields>({
    title: t.title,
    category: t.category,
    category2: t.category2,
    priority: t.priority,
    date: t.date,
    time: t.time,
    endDate: t.endDate,
    endTime: t.endTime,
    durationMin: t.durationMin,
    note: t.note,
    repeat: currentSeries ? currentSeries.repeat : "none",
    projectId: t.projectId,
    client: t.client,
  });

  // Aplica a edição e, se a data andou pra frente (ou sumiu), registra o
  // adiamento. Em tarefa desafiadora o registro vem com o motivo e a
  // historinha — por isso a pergunta acontece ANTES de salvar.
  function aplicar(finalVals: TaskEditFields, reason: string | null) {
    onDone();
    function doApply(scope: "esta" | "proximas" | "todas" | null) {
      board.saveTaskEdit(t.id, finalVals, scope);
      board.logPostponement(t.id, t.date, finalVals.date, reason);
    }
    if (t.seriesId) {
      askScope("Essa tarefa faz parte de uma repetição. Aplicar a mudança em:", doApply);
    } else {
      doApply(null);
    }
  }

  function save() {
    const finalVals: TaskEditFields = { ...vals, title: vals.title.trim() || t.title, note: vals.note.trim() };
    const adiando = t.date !== null && (finalVals.date === null || finalVals.date > t.date);
    if (adiando && t.challenging) {
      setPostponing(finalVals);
      return;
    }
    aplicar(finalVals, null);
  }

  return (
    <div className="edit-row" data-id={t.id}>
      {/* Salvar e fechar no TOPO também: antes só existia lá embaixo, e quem
          abria uma tarefa longa tinha que rolar a tela inteira só pra fechar. */}
      <div className="edit-title-row">
        <input
          type="text"
          className="edit-title-input"
          value={vals.title}
          autoFocus
          placeholder="Título da tarefa"
          onChange={(e) => setVals((v) => ({ ...v, title: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button
          type="button"
          className="icon-btn edit-collapse-btn"
          title="Salvar e recolher"
          aria-label="Salvar e recolher a tarefa"
          onClick={save}
        >
          <ChevronIcon />
        </button>
      </div>
      {/* Lista de propriedades no estilo "ícone + nome + valor", em duas colunas:
          os campos ficam alinhados e discretos, sem virar um monte de caixas. */}
      <div className="prop-list">
        <div className="prop-row">
          <span className="prop-label">
            <HashIcon /> ID
          </span>
          <div className="prop-value">
            <TaskCodeField code={t.code} />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">
            <WeekIcon /> Quando
          </span>
          <div className="prop-value">
            <TaskWhenButton
              date={vals.date}
              time={vals.time}
              endDate={vals.endDate}
              endTime={vals.endTime}
              onSave={(f) => setVals((v) => ({ ...v, ...f }))}
            />
          </div>
        </div>
        <label className="prop-row">
          <span className="prop-label">
            <FlagIcon color="currentColor" /> Prioridade
          </span>
          <div className="prop-value">
            <select value={vals.priority} onChange={(e) => setVals((v) => ({ ...v, priority: e.target.value as Priority }))}>
              {PRIORITIES.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.l}
                </option>
              ))}
            </select>
          </div>
        </label>
        <div className="prop-row">
          <span className="prop-label">
            <CalendarCheckIcon /> Evento
          </span>
          <div className="prop-value">
            <label className="challenging-toggle">
              <ToggleSwitch
                checked={t.isEvent}
                ariaLabel="Marcar como evento"
                onChange={(v) => board.setIsEvent(t.id, v)}
              />
              <span className="challenging-hint">
                {t.isEvent ? "Compromisso com hora marcada" : "Tarefa comum, posso mover"}
              </span>
            </label>
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">
            <ShieldWarningIcon /> Desafiadora
          </span>
          <div className="prop-value">
            <label className="challenging-toggle">
              <ToggleSwitch
                checked={t.challenging}
                ariaLabel="Marcar como tarefa desafiadora"
                onChange={(v) => board.setChallenging(t.id, v)}
              />
              <span className="challenging-hint">
                {t.challenging
                  ? adiamentos > 0
                    ? `Adiar pede justificativa — já adiada ${adiamentos}x`
                    : "Adiar pede justificativa"
                  : "Dessa eu fujo"}
              </span>
            </label>
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">
            <TagIcon /> Categorias
          </span>
          <div className="prop-value">
            <CategoryPicker
              category={vals.category}
              category2={vals.category2}
              onChange={(category, category2) => setVals((v) => ({ ...v, category, category2 }))}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">
            <ClockIcon /> Duração
          </span>
          <div className="prop-value">
            <MinutesPicker
              minutes={vals.durationMin}
              placeholder="Vazio"
              onChange={(m) => setVals((v) => ({ ...v, durationMin: m }))}
              onClear={() => setVals((v) => ({ ...v, durationMin: null }))}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">
            <PlayCircleIcon /> Tempo
          </span>
          <div className="prop-value">
            <TaskTimeButton taskId={t.id} />
          </div>
        </div>
        <label className="prop-row">
          <span className="prop-label">
            <UserIcon /> Cliente
          </span>
          <div className="prop-value">
            <input
              type="text"
              list={clientListId}
              value={vals.client ?? ""}
              placeholder="Vazio"
              onChange={(e) => setVals((v) => ({ ...v, client: e.target.value || null }))}
            />
            <datalist id={clientListId}>
              {clientOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </label>
        <label className="prop-row">
          <span className="prop-label">
            <RepeatIcon /> Repete
          </span>
          <div className="prop-value">
            <select value={vals.repeat} onChange={(e) => setVals((v) => ({ ...v, repeat: e.target.value as Repeat }))}>
              {REPEATS.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="prop-row">
          <span className="prop-label">
            <FolderIcon /> Projeto
          </span>
          <div className="prop-value">
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
          </div>
        </label>
        <div className="prop-row">
          <span className="prop-label">
            <BellIcon /> Lembrete
          </span>
          <div className="prop-value">
            <ReminderDateButton
              date={linkedReminder?.date ?? null}
              time={linkedReminder?.time ?? null}
              repeat={linkedReminder?.repeat ?? "none"}
              weekDays={linkedReminder?.weekDays ?? null}
              alertMinutesBefore={linkedReminder?.alertMinutesBefore ?? null}
              onSave={(fields) => board.setTaskReminder(t.id, fields)}
              emptyLabel="Vazio"
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">
            <PaperclipIcon /> Anexos
          </span>
          <div className="prop-value">
            <AttachmentsButton variant="field" entityType="task" entityId={t.id} ariaLabel="Anexos da tarefa" />
          </div>
        </div>
      </div>
      <div className="edit-note">
        <span className="prop-label">
          <CommentIcon /> Observação
        </span>
        <NoteField
          value={vals.note}
          placeholder="Escreva ou cole um texto aqui..."
          ariaLabel="Observação da tarefa"
          onChange={(html) => setVals((v) => ({ ...v, note: html }))}
          onPersist={(html) => board.updateTaskNote(t.id, html)}
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
      {postponing && (
        <PostponeModal
          taskTitle={t.title}
          fromDate={t.date!}
          toDate={postponing.date}
          jaAdiada={adiamentos}
          onCancel={() => setPostponing(null)}
          onConfirm={(reason) => {
            const finalVals = postponing;
            setPostponing(null);
            aplicar(finalVals, reason);
          }}
        />
      )}
    </div>
  );
}
