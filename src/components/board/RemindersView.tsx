"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { CommentButton } from "./CommentButton";
import { BellIcon, CheckIcon, EraserIcon, RepeatIcon, TrashIcon, WarningIcon, WeekIcon } from "./icons";
import { TimePicker } from "./TimePicker";
import { DAY_NAMES, fmtShortDate, todayISO } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { REMINDER_ALERT_PRESETS, isReminderOverdue, reminderTargetMs } from "@/lib/board/reminder-alerts";
import type { Reminder, Repeat } from "@/lib/types";

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

function ReminderDateButton({ reminder }: { reminder: Reminder }) {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const open = anchorRect !== null;
  const [dateDraft, setDateDraft] = useState(reminder.date ?? "");
  const [timeDraft, setTimeDraft] = useState(reminder.time ?? "");
  const [repeatDraft, setRepeatDraft] = useState<Repeat>(reminder.repeat);
  const [weekDraft, setWeekDraft] = useState<number[]>(reminder.weekDays ?? []);
  const [alertDraft, setAlertDraft] = useState<number | null>(reminder.alertMinutesBefore);
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
    setDateDraft(reminder.date ?? "");
    setTimeDraft(reminder.time ?? "");
    setRepeatDraft(reminder.repeat);
    setWeekDraft(reminder.weekDays ?? []);
    setAlertDraft(reminder.alertMinutesBefore);
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
    board.updateReminder(reminder.id, {
      date: nextDate,
      time: nextDate ? timeDraft || null : null,
      repeat: hasWeekDays ? "none" : nextDate ? repeatDraft : "none",
      weekDays: hasWeekDays ? [...weekDraft].sort((a, b) => a - b) : null,
      alertMinutesBefore: nextDate ? alertDraft : null,
    });
    setAnchorRect(null);
  }

  const alertLabel = REMINDER_ALERT_PRESETS.find((p) => p.v === reminder.alertMinutesBefore)?.l;
  const weekLabel =
    reminder.weekDays && reminder.weekDays.length > 0 && reminder.weekDays.length < 7
      ? [...reminder.weekDays].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(",")
      : null;
  const hasSchedule = !!reminder.date || !!weekLabel;
  const label = hasSchedule
    ? [
        reminder.date ? fmtShortDate(reminder.date) + (reminder.time ? ` às ${reminder.time}` : "") : null,
        weekLabel,
        reminder.repeat !== "none" ? REPEAT_SHORT[reminder.repeat] : null,
        reminder.alertMinutesBefore ? `aviso ${alertLabel}` : null,
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
        title={label ?? "Definir data"}
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
              <TimePicker value={timeDraft} disabled={!dateDraft} onChange={setTimeDraft} />
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
              disabled={!dateDraft}
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

export function ReminderRow({ reminder }: { reminder: Reminder }) {
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
  const isRecurring = reminder.repeat !== "none" || (reminder.weekDays?.length ?? 0) > 0;

  return (
    <div
      className={
        "reminder-row" +
        (reminder.done ? " done" : "") +
        (overdue ? " overdue" : "") +
        (dueToday ? " due-today" : "")
      }
    >
      <button
        type="button"
        className={"reminder-check" + (reminder.done ? " done" : "")}
        aria-label={reminder.done ? "Marcar como não concluído" : "Marcar como concluído"}
        onClick={() => board.updateReminder(reminder.id, { done: !reminder.done })}
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
        <span className="chip chip-recurring" title="Lembrete recorrente">
          <RepeatIcon /> Recorrente
        </span>
      )}
      <CommentButton
        value={reminder.note}
        placeholder="Observação — cole um texto ou escreva algo..."
        ariaLabel="Observação do lembrete"
        onSave={(text) => board.updateReminder(reminder.id, { note: text || null })}
      />
      <ReminderDateButton reminder={reminder} />
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

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addReminder(title);
    setNewTitle("");
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
                  <ReminderRow key={r.id} reminder={r} />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export function RemindersView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [newTitle, setNewTitle] = useState("");

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addReminder(title);
    setNewTitle("");
  }

  const notDone = board.state.reminders.filter((r) => !r.done);
  const overdue = sortByClosestDate(notDone.filter((r) => isReminderOverdue(r)));
  const pending = sortByClosestDate(notDone.filter((r) => !isReminderOverdue(r)));
  const done = board.state.reminders.filter((r) => r.done);

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Lembretes</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list">
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
            />
          </div>
        </div>

        {overdue.length > 0 && (
          <div className="list-card">
            <div className="list-card-section-label overdue-label">
              <WarningIcon /> Vencidos
            </div>
            {overdue.map((r) => (
              <ReminderRow key={r.id} reminder={r} />
            ))}
          </div>
        )}

        {(pending.length > 0 || overdue.length === 0) && (
          <div className="list-card">
            {pending.length === 0 ? (
              <div className="hp-empty">Nenhum lembrete pendente.</div>
            ) : (
              pending.map((r) => <ReminderRow key={r.id} reminder={r} />)
            )}
          </div>
        )}

        {done.length > 0 && (
          <div className="list-card">
            {done.map((r) => (
              <ReminderRow key={r.id} reminder={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
