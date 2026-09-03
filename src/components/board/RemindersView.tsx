"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { AttachmentsButton } from "./AttachmentsButton";
import { CommentButton } from "./CommentButton";
import {
  BellIcon,
  CheckIcon,
  EraserIcon,
  ExpandIcon,
  RepeatIcon,
  TrashIcon,
  UsersGroupIcon,
  WarningIcon,
  WeekIcon,
} from "./icons";
import { RichTextEditor } from "./RichTextEditor";
import { TimePicker } from "./TimePicker";
import { DAY_NAMES, fmtDayMonth, isoAddDays, todayISO } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { countOpenChecklistItems } from "@/lib/rich-text";
import { isMeetingTask } from "@/lib/types";
import { REMINDER_ALERT_PRESETS, isReminderOverdue, isRecurringReminder, reminderTargetMs } from "@/lib/board/reminder-alerts";
import type { Reminder, ReminderStatus, Repeat } from "@/lib/types";

const REPEATS: { v: Repeat; l: string }[] = [
  { v: "none", l: "Não repete" },
  { v: "daily", l: "Todo dia" },
  { v: "weekly", l: "Toda semana" },
  { v: "monthly", l: "Mensalmente" },
  { v: "yearly", l: "Anualmente" },
];

const REPEAT_SHORT: Record<Repeat, string> = {
  none: "",
  daily: "todo dia",
  weekly: "toda semana",
  monthly: "mensal",
  yearly: "anual",
};

type ReminderFilter = "todos" | "recorrentes" | "hoje" | "semana" | "atrasados";

const REMINDER_FILTERS: { v: ReminderFilter; l: string }[] = [
  { v: "todos", l: "Todos" },
  { v: "recorrentes", l: "Recorrentes" },
  { v: "hoje", l: "Hoje" },
  { v: "semana", l: "Semana" },
  { v: "atrasados", l: "Atrasados" },
];

function matchesReminderFilter(r: Reminder, filter: ReminderFilter, today: string, weekEnd: string): boolean {
  if (filter === "todos") return true;
  if (filter === "recorrentes") return isRecurringReminder(r);
  if (filter === "atrasados") return isReminderOverdue(r);
  if (filter === "hoje") return r.date === today;
  if (filter === "semana") return !!r.date && r.date >= today && r.date <= weekEnd;
  return true;
}

// Ordena pelos mais próximos primeiro (vencidos: o que venceu há mais tempo primeiro);
// sem data marcada fica sempre por último.
function sortByClosestDate(list: Reminder[]): Reminder[] {
  return [...list].sort((a, b) => {
    const ta = reminderTargetMs(a);
    const tb = reminderTargetMs(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });
}

export interface ReminderScheduleFields {
  date: string | null;
  time: string | null;
  repeat: Repeat;
  weekDays: number[] | null;
  alertMinutesBefore: number | null;
}

export function ReminderDateButton({
  date,
  time,
  repeat,
  weekDays,
  alertMinutesBefore,
  onSave,
  emptyLabel = "Definir data",
}: ReminderScheduleFields & { onSave: (fields: ReminderScheduleFields) => void; emptyLabel?: string }) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const open = anchorRect !== null;
  const [dateDraft, setDateDraft] = useState(date ?? "");
  const [timeDraft, setTimeDraft] = useState(time ?? "");
  const [repeatDraft, setRepeatDraft] = useState<Repeat>(repeat);
  const [weekDraft, setWeekDraft] = useState<number[]>(weekDays ?? []);
  const [alertDraft, setAlertDraft] = useState<number | null>(alertMinutesBefore);
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
    setRepeatDraft(repeat);
    setWeekDraft(weekDays ?? []);
    setAlertDraft(alertMinutesBefore);
    if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  }

  function toggleWeekDay(d: number) {
    setWeekDraft((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function save() {
    const nextDate = dateDraft || null;
    const hasWeekDays = weekDraft.length > 0 && weekDraft.length < 7;
    onSave({
      date: nextDate,
      time: nextDate || hasWeekDays ? timeDraft || null : null,
      repeat: hasWeekDays ? "none" : nextDate ? repeatDraft : "none",
      weekDays: hasWeekDays ? [...weekDraft].sort((a, b) => a - b) : null,
      alertMinutesBefore: nextDate || hasWeekDays ? alertDraft : null,
    });
    setAnchorRect(null);
  }

  const alertLabel = REMINDER_ALERT_PRESETS.find((p) => p.v === alertMinutesBefore)?.l;
  const weekLabel =
    weekDays && weekDays.length > 0 && weekDays.length < 7
      ? [...weekDays].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(",")
      : null;
  const hasSchedule = !!date || !!weekLabel;
  const label = hasSchedule
    ? [
        date ? fmtDayMonth(date) + (time ? ` às ${time}` : "") : null,
        weekLabel,
        repeat !== "none" ? REPEAT_SHORT[repeat] : null,
        alertMinutesBefore ? `aviso ${alertLabel}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"reminder-date-btn" + (hasSchedule ? " has-date" : "")}
        title={label ?? emptyLabel}
        onClick={toggleOpen}
      >
        <WeekIcon />
        {label && <span>{label}</span>}
      </button>
      {open &&
        createPortal(
          <div className="daylog-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <div className="reminder-datetime-row">
              <input
                type="date"
                autoFocus
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAnchorRect(null)}
              />
              <TimePicker value={timeDraft} disabled={!dateDraft && weekDraft.length === 0} onChange={setTimeDraft} />
              <button
                type="button"
                className="icon-btn reminder-clear-btn"
                disabled={!dateDraft && !timeDraft}
                title="Limpar data e hora"
                onClick={() => {
                  setDateDraft("");
                  setTimeDraft("");
                }}
              >
                <EraserIcon />
              </button>
            </div>
            <div className="edit-field">
              <span className="edit-field-label">Repete nesses dias da semana (opcional)</span>
              <div className="weekday-picker">
                {DAY_NAMES.map((label, d) => (
                  <button
                    key={d}
                    type="button"
                    className={"weekday-btn" + (weekDraft.includes(d) ? " active" : "")}
                    title={label}
                    onClick={() => toggleWeekDay(d)}
                  >
                    {label[0]}
                  </button>
                ))}
              </div>
            </div>
            <select
              className="reminder-repeat-select"
              value={weekDraft.length > 0 ? "none" : repeatDraft}
              disabled={!dateDraft || weekDraft.length > 0}
              title={weekDraft.length > 0 ? "Desativado — já repete nos dias da semana marcados acima" : undefined}
              onChange={(e) => setRepeatDraft(e.target.value as Repeat)}
            >
              {REPEATS.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </select>
            <select
              className="reminder-repeat-select"
              value={alertDraft ?? ""}
              disabled={!dateDraft && weekDraft.length === 0}
              onChange={(e) => setAlertDraft(e.target.value ? Number(e.target.value) : null)}
            >
              {REMINDER_ALERT_PRESETS.map((p) => (
                <option key={p.l} value={p.v ?? ""}>
                  {p.l}
                </option>
              ))}
            </select>
            <div className="edit-actions">
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

function ReminderStatusMenu({
  anchorRect,
  status,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  status: ReminderStatus;
  onSelect: (status: ReminderStatus) => void;
  onClose: () => void;
}) {
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
      <button
        type="button"
        className={"status-menu-item" + (status === "pending" ? " active" : "")}
        onClick={() => {
          onSelect("pending");
          onClose();
        }}
      >
        <span className="status-menu-dot" style={{ background: "var(--text-faint)" }} /> Pendente
      </button>
      <button
        type="button"
        className={"status-menu-item" + (status === "waiting" ? " active" : "")}
        onClick={() => {
          onSelect("waiting");
          onClose();
        }}
      >
        <span className="status-menu-dot" style={{ background: "#D9A400" }} /> Aguardando
      </button>
      <button
        type="button"
        className={"status-menu-item" + (status === "done" ? " active" : "")}
        onClick={() => {
          onSelect("done");
          onClose();
        }}
      >
        <CheckIcon /> Concluído
      </button>
    </div>,
    document.body
  );
}

function reminderStatus(reminder: Reminder, overdue: boolean, dueToday: boolean) {
  if (reminder.done) return { label: "Concluído", cls: "status-done" };
  if (reminder.status === "waiting") return { label: "Aguardando", cls: "status-waiting" };
  if (overdue) return { label: "Vencido", cls: "status-overdue" };
  if (dueToday) return { label: "Hoje", cls: "status-today" };
  return { label: "Pendente", cls: "status-pending" };
}

// Grid fixo (sem drag-to-resize), reaproveitando o mesmo visual da tabela de tarefas.
const REMINDER_GRID = "36px 80px minmax(130px,1fr) 90px 150px 32px 44px";

function ReminderTableHeader() {
  return (
    <div className="task-list-header" style={{ gridTemplateColumns: REMINDER_GRID }}>
      <span className="tlh-cell tlh-center">Abrir</span>
      <span className="tlh-cell">Status</span>
      <span className="tlh-cell">Descrição</span>
      <span className="tlh-cell">Tipo</span>
      <span className="tlh-cell">Data</span>
      <span className="tlh-cell tlh-center">Obs</span>
      <span className="tlh-cell tlh-center">Excluir</span>
    </div>
  );
}

function ReminderDetailModal({ reminder, onClose }: { reminder: Reminder; onClose: () => void }) {
  const { board } = useBoardCtx();
  const [titleDraft, setTitleDraft] = useState(reminder.title);
  const [noteDraft, setNoteDraft] = useState(reminder.note ?? "");
  const noteDraftRef = useRef(noteDraft);

  useEffect(() => {
    noteDraftRef.current = noteDraft;
  }, [noteDraft]);

  const overdue = isReminderOverdue(reminder);
  const dueToday = !reminder.done && !overdue && reminder.date === todayISO();
  const isRecurring = isRecurringReminder(reminder);
  const status = reminderStatus(reminder, overdue, dueToday);

  // Auto-save a observação a cada 30s pra não perder texto se fechar sem clicar em Salvar.
  useEffect(() => {
    const id = setInterval(() => board.updateReminder(reminder.id, { note: noteDraftRef.current || null }), 30000);
    return () => clearInterval(id);
  }, [board, reminder.id]);

  function save() {
    const trimmedTitle = titleDraft.trim();
    board.updateReminder(reminder.id, { title: trimmedTitle || reminder.title, note: noteDraft || null });
    onClose();
  }

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel reminder-detail-sheet" role="dialog" aria-label="Detalhes do lembrete">
        <div className="modal-head">
          <span className={"reminder-status-chip " + status.cls}>
            {reminder.done && <CheckIcon />}
            {status.label}
          </span>
          <span className="modal-head-actions">
            <AttachmentsButton entityType="reminder" entityId={reminder.id} ariaLabel="Anexos do lembrete" />
            <button
              type="button"
              className="icon-btn danger-hover"
              title="Excluir lembrete"
              onClick={() => {
                board.deleteReminder(reminder.id);
                onClose();
              }}
            >
              <TrashIcon />
            </button>
          </span>
        </div>
        <input
          type="text"
          className="reminder-detail-title-input"
          value={titleDraft}
          autoFocus
          onChange={(e) => setTitleDraft(e.target.value)}
        />
        <div className="reminder-detail-meta">
          {isRecurring && (
            <span className="chip chip-recurring">
              <RepeatIcon /> Recorrente
            </span>
          )}
          <ReminderDateButton
            date={reminder.date}
            time={reminder.time}
            repeat={reminder.repeat}
            weekDays={reminder.weekDays}
            alertMinutesBefore={reminder.alertMinutesBefore}
            onSave={(fields) => board.updateReminder(reminder.id, fields)}
          />
        </div>
        <label className="edit-field">
          <span className="edit-field-label">Observação</span>
          <RichTextEditor
            value={noteDraft}
            onChange={setNoteDraft}
            placeholder="Cole um texto ou escreva algo..."
          />
        </label>
        <div className="edit-actions" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" onClick={save}>
            Salvar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export function ReminderRow({ reminder }: { reminder: Reminder }) {
  const { board, focusRequest, consumeFocusRequest } = useBoardCtx();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [statusAnchor, setStatusAnchor] = useState<DOMRect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const statusBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusRequest?.kind === "reminder" && focusRequest.id === reminder.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reagindo a um pedido de foco vindo da busca (sistema externo)
      setDetailOpen(true);
      document.querySelector(`[data-id="${reminder.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      consumeFocusRequest("reminder", reminder.id);
    }
  }, [focusRequest, consumeFocusRequest, reminder.id]);

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== reminder.title) board.updateReminder(reminder.id, { title: trimmed });
    setTitleDraft(null);
  }

  function applyStatus(status: ReminderStatus) {
    if (status === "done") board.completeReminder(reminder.id);
    else board.updateReminder(reminder.id, { done: false, status });
  }

  const today = todayISO();
  const overdue = isReminderOverdue(reminder);
  const dueToday = !reminder.done && !overdue && reminder.date === today;
  const isRecurring = isRecurringReminder(reminder);
  const status = reminderStatus(reminder, overdue, dueToday);

  return (
    <div
      data-id={reminder.id}
      className={
        "reminder-table-row" +
        (reminder.done ? " done" : "") +
        (overdue ? " overdue" : "") +
        (dueToday ? " due-today" : "")
      }
      style={{ gridTemplateColumns: REMINDER_GRID }}
    >
      <button
        type="button"
        className="icon-btn reminder-expand-btn"
        title="Abrir lembrete completo (texto e observação)"
        onClick={() => setDetailOpen(true)}
      >
        <ExpandIcon />
      </button>
      <button
        ref={statusBtnRef}
        type="button"
        className={"reminder-status-chip " + status.cls}
        title="Escolher status"
        onClick={() => setStatusAnchor(statusBtnRef.current?.getBoundingClientRect() ?? null)}
      >
        {reminder.done && <CheckIcon />}
        {status.label}
      </button>
      {statusAnchor && (
        <ReminderStatusMenu
          anchorRect={statusAnchor}
          status={reminder.status}
          onSelect={applyStatus}
          onClose={() => setStatusAnchor(null)}
        />
      )}
      <input
        type="text"
        className="reminder-title-input"
        value={titleDraft ?? reminder.title}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <span className={"chip" + (isRecurring ? " chip-recurring" : " chip-oneoff")}>
        {isRecurring && <RepeatIcon />} {isRecurring ? "Recorrente" : "Pontual"}
      </span>
      <ReminderDateButton
        date={reminder.date}
        time={reminder.time}
        repeat={reminder.repeat}
        weekDays={reminder.weekDays}
        alertMinutesBefore={reminder.alertMinutesBefore}
        onSave={(fields) => board.updateReminder(reminder.id, fields)}
      />
      <CommentButton
        alwaysExpanded
        value={reminder.note}
        placeholder="Observação — cole um texto ou escreva algo..."
        ariaLabel="Observação do lembrete"
        onSave={(text) => board.updateReminder(reminder.id, { note: text || null })}
      />
      <button
        className="icon-btn danger-hover"
        type="button"
        title="Excluir"
        onClick={() => board.deleteReminder(reminder.id)}
      >
        <TrashIcon />
      </button>
      {detailOpen && <ReminderDetailModal reminder={reminder} onClose={() => setDetailOpen(false)} />}
    </div>
  );
}

// Versão compacta (linha única, sem grid) pro popover estreito do sininho.
function ReminderCompactRow({ reminder }: { reminder: Reminder }) {
  const { board } = useBoardCtx();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== reminder.title) board.updateReminder(reminder.id, { title: trimmed });
    setTitleDraft(null);
  }

  const today = todayISO();
  const overdue = isReminderOverdue(reminder);
  const dueToday = !reminder.done && !overdue && reminder.date === today;
  const isRecurring = isRecurringReminder(reminder);

  return (
    <div
      className={
        "reminder-row" + (reminder.done ? " done" : "") + (overdue ? " overdue" : "") + (dueToday ? " due-today" : "")
      }
    >
      <button
        type="button"
        className={"reminder-check" + (reminder.done ? " done" : "")}
        title={reminder.done ? "Marcar como não concluído" : "Marcar como concluído"}
        onClick={() =>
          reminder.done
            ? board.updateReminder(reminder.id, { done: false, status: "pending" })
            : board.completeReminder(reminder.id)
        }
      >
        {reminder.done && <CheckIcon />}
      </button>
      <input
        type="text"
        className="reminder-title-input"
        value={titleDraft ?? reminder.title}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      {isRecurring && (
        <span className="chip chip-recurring">
          <RepeatIcon />
        </span>
      )}
      <ReminderDateButton
        date={reminder.date}
        time={reminder.time}
        repeat={reminder.repeat}
        weekDays={reminder.weekDays}
        alertMinutesBefore={reminder.alertMinutesBefore}
        onSave={(fields) => board.updateReminder(reminder.id, fields)}
      />
      <button
        className="icon-btn danger-hover"
        type="button"
        title="Excluir"
        onClick={() => board.deleteReminder(reminder.id)}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function RemindersButton({ onOpenFull }: { onOpenFull: () => void }) {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      // Ignora cliques dentro de popovers filhos (ex.: o seletor de data de um lembrete),
      // que são portais próprios pra document.body e não ficam "dentro" de popRef no DOM.
      if ((e.target as HTMLElement).closest?.(".daylog-popover")) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  const today = todayISO();
  const pending = [...board.state.reminders]
    .filter((r) => !r.done)
    .sort((a, b) => (a.date ?? "9999-99-99").localeCompare(b.date ?? "9999-99-99"));
  const overdueCount = pending.filter((r) => isReminderOverdue(r)).length;
  const dueTodayCount = pending.filter((r) => r.date === today && !isReminderOverdue(r)).length;
  const hasOverdue = overdueCount > 0;
  const hasDueToday = dueTodayCount > 0;
  const badgeCount = hasOverdue ? overdueCount : dueTodayCount;

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    const ok = await board.addReminder(title);
    if (!ok) setNewTitle(title);
  }

  return (
    <>
      <button ref={btnRef} type="button" className="reminders-btn" onClick={toggleOpen}>
        <span className={"reminders-btn-bell" + (hasOverdue ? " overdue" : hasDueToday ? " due-today" : "")}>
          <BellIcon filled={hasOverdue || hasDueToday} />
          {badgeCount > 0 && <span className="reminders-btn-count">{badgeCount > 9 ? "9+" : badgeCount}</span>}
        </span>
        Lembretes
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="reminders-popover" ref={popRef} style={{ top: pos.top, right: pos.right }}>
            <div className="reminders-popover-head">
              <span>Lembretes</span>
              <button
                type="button"
                className="reminders-popover-viewall"
                onClick={() => {
                  setOpen(false);
                  onOpenFull();
                }}
              >
                Ver todos
              </button>
            </div>
            <div className="quickadd-row">
              <span className="quickadd-plus" aria-hidden="true">
                +
              </span>
              <input
                type="text"
                className="quickadd-input"
                placeholder="+ Adicionar lembrete"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            {pending.length === 0 ? (
              <div className="hp-empty">Nenhum lembrete pendente.</div>
            ) : (
              <div className="reminders-popover-list">
                {pending.map((r) => (
                  <ReminderCompactRow key={r.id} reminder={r} />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export function RemindersView({ onBack, onOpenMeetings }: { onBack: () => void; onOpenMeetings?: () => void }) {
  const { board } = useBoardCtx();
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<ReminderFilter>("todos");
  const openMeetingsCount = board.state.tasks.filter(
    (t) => isMeetingTask(t) && countOpenChecklistItems(t.note) > 0
  ).length;

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    const ok = await board.addReminder(title);
    if (!ok) setNewTitle(title);
  }

  const today = todayISO();
  const weekEnd = isoAddDays(today, 7);
  const filtered = board.state.reminders.filter((r) => matchesReminderFilter(r, filter, today, weekEnd));
  const notDone = filtered.filter((r) => !r.done);
  const overdue = sortByClosestDate(notDone.filter((r) => isReminderOverdue(r)));
  const pending = sortByClosestDate(notDone.filter((r) => !isReminderOverdue(r)));
  const done = filtered.filter((r) => r.done);

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Lembretes</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list reminders-wide">
        {openMeetingsCount > 0 && (
          <button type="button" className="meetings-pautas-banner" onClick={onOpenMeetings}>
            <UsersGroupIcon />
            <span>
              {openMeetingsCount} reunião{openMeetingsCount > 1 ? "ões" : ""} com pauta em aberto — clique pra ver
              em Reuniões
            </span>
          </button>
        )}
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Adicionar lembrete e pressionar Enter"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={handleAdd}
            />
          </div>
        </div>

        <div className="reminder-filter-bar">
          <span className="reminder-filter-label">Filtrar por:</span>
          <div className="view-toggle reminder-filter-row">
            {REMINDER_FILTERS.map((f) => (
              <button
                key={f.v}
                type="button"
                className={"view-toggle-btn" + (filter === f.v ? " active" : "")}
                onClick={() => setFilter(f.v)}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {overdue.length === 0 && pending.length === 0 && done.length === 0 && (
          <div className="list-card">
            <div className="hp-empty">
              {filter === "todos" ? "Nenhum lembrete ainda." : "Nenhum lembrete encontrado com esse filtro."}
            </div>
          </div>
        )}

        {overdue.length > 0 && (
          <div className="list-card">
            <div className="list-card-section-label overdue-label">
              <WarningIcon /> Vencidos
            </div>
            <div className="task-table-scroll">
              <ReminderTableHeader />
              {overdue.map((r) => (
                <ReminderRow key={r.id} reminder={r} />
              ))}
            </div>
          </div>
        )}

        {pending.length > 0 && (
          <div className="list-card">
            <div className="task-table-scroll">
              <ReminderTableHeader />
              {pending.map((r) => (
                <ReminderRow key={r.id} reminder={r} />
              ))}
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div className="list-card">
            <div className="task-table-scroll">
              <ReminderTableHeader />
              {done.map((r) => (
                <ReminderRow key={r.id} reminder={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
