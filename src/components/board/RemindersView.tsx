"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { BellIcon, CheckIcon, RepeatIcon, TrashIcon, WeekIcon } from "./icons";
import { fmtShortDate, todayISO } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
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

function ReminderDateButton({ reminder }: { reminder: Reminder }) {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const open = anchorRect !== null;
  const [dateDraft, setDateDraft] = useState(reminder.date ?? "");
  const [timeDraft, setTimeDraft] = useState(reminder.time ?? "");
  const [repeatDraft, setRepeatDraft] = useState<Repeat>(reminder.repeat);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
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
    if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  }

  function save() {
    const nextDate = dateDraft || null;
    board.updateReminder(reminder.id, {
      date: nextDate,
      time: nextDate ? timeDraft || null : null,
      repeat: nextDate ? repeatDraft : "none",
    });
    setAnchorRect(null);
  }

  const label = reminder.date
    ? fmtShortDate(reminder.date) +
      (reminder.time ? ` às ${reminder.time}` : "") +
      (reminder.repeat !== "none" ? ` · ${REPEAT_SHORT[reminder.repeat]}` : "")
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"reminder-date-btn" + (reminder.date ? " has-date" : "")}
        title={reminder.date ? `Data: ${fmtShortDate(reminder.date)}` : "Definir data"}
        onClick={toggleOpen}
      >
        <WeekIcon />
        {label && <span>{label}</span>}
      </button>
      {open &&
        createPortal(
          <div className="daylog-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <input
              type="date"
              autoFocus
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAnchorRect(null)}
            />
            <input
              type="time"
              value={timeDraft}
              disabled={!dateDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAnchorRect(null)}
            />
            <select
              className="reminder-repeat-select"
              value={repeatDraft}
              disabled={!dateDraft}
              onChange={(e) => setRepeatDraft(e.target.value as Repeat)}
            >
              {REPEATS.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
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
  const overdue = !reminder.done && !!reminder.date && reminder.date < today;
  const dueToday = !reminder.done && reminder.date === today;

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
      {reminder.repeat !== "none" && (
        <span className="reminder-repeat-flag" title={`Repete: ${REPEAT_SHORT[reminder.repeat]}`}>
          <RepeatIcon />
        </span>
      )}
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
  const hasOverdue = pending.some((r) => r.date && r.date < today);
  const hasDueToday = pending.some((r) => r.date === today);

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
          <BellIcon />
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

  const pending = board.state.reminders.filter((r) => !r.done);
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

        <div className="list-card">
          {pending.length === 0 ? (
            <div className="hp-empty">Nenhum lembrete pendente.</div>
          ) : (
            pending.map((r) => <ReminderRow key={r.id} reminder={r} />)
          )}
        </div>

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
