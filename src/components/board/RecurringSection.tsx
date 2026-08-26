"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { TimerButton } from "./TimerButton";
import { EditIcon, TrashIcon } from "./icons";
import { fmtDayLabel, fmtHM, isoFromDate, todayISO, weekDatesFrom } from "@/lib/date-utils";
import type { RecurringItem } from "@/lib/types";

type Kind = "habit" | "block";

export function RecurringSection({ kind, weekAnchor }: { kind: Kind; weekAnchor: Date }) {
  const { board } = useBoardCtx();
  const list = kind === "habit" ? board.state.habits : board.state.fixedBlocks;
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const sorted = [...list].sort((a, b) => a.order - b.order);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    board.addRecurring(kind, name, newDuration ? parseInt(newDuration, 10) || 0 : null);
    setNewName("");
    setNewDuration("");
  }

  return (
    <div className="habit-strip">
      <div>
        {sorted.map((item) => (
          <RecurringRow key={item.id} kind={kind} item={item} weekAnchor={weekAnchor} />
        ))}
      </div>
      <div className="habit-add">
        <input
          type="text"
          placeholder={kind === "habit" ? "+ novo hábito (ex.: água, meditação)" : "+ novo bloco (ex.: almoço)"}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <input
          type="number"
          min={0}
          step={5}
          placeholder="min"
          className="block-duration-input"
          value={newDuration}
          onChange={(e) => setNewDuration(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
}

function DayLogPopover({
  anchorRect,
  initialMinutes,
  initialNote,
  onSave,
  onCancel,
}: {
  anchorRect: DOMRect;
  initialMinutes: number;
  initialNote: string;
  onSave: (minutes: number, note: string) => void;
  onCancel: () => void;
}) {
  const [minutes, setMinutes] = useState(String(initialMinutes));
  const [note, setNote] = useState(initialNote);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onCancel]);

  function commit() {
    let m = parseInt(minutes, 10);
    if (isNaN(m) || m < 0) m = 0;
    onSave(m, note);
  }

  return createPortal(
    <div className="daylog-popover" ref={ref} style={{ top: anchorRect.bottom + 4, left: anchorRect.left }}>
      <label className="edit-field">
        <span className="edit-field-label">Minutos</span>
        <input
          type="number"
          min={0}
          step={5}
          autoFocus
          value={minutes}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setMinutes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") onCancel();
          }}
        />
      </label>
      <label className="edit-field">
        <span className="edit-field-label">Nota (opcional)</span>
        <input
          type="text"
          placeholder="ex.: praia, filme..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") onCancel();
          }}
        />
      </label>
      <div className="edit-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-accent" onClick={commit}>
          Salvar
        </button>
      </div>
    </div>,
    document.body
  );
}

function RecurringRow({ kind, item, weekAnchor }: { kind: Kind; item: RecurringItem; weekAnchor: Date }) {
  const { board } = useBoardCtx();
  const [editing, setEditing] = useState(false);
  const [dayEditor, setDayEditor] = useState<{ iso: string; rect: DOMRect } | null>(null);
  const today = todayISO();
  const weekDates = weekDatesFrom(weekAnchor);

  if (editing) {
    return <RecurringEditRow kind={kind} item={item} onDone={() => setEditing(false)} />;
  }

  function openDayEditor(iso: string, rect: DOMRect) {
    setDayEditor({ iso, rect });
  }

  return (
    <div className="habit-row">
      <div className="habit-name-wrap">
        <span className="habit-name">
          {item.name}
          {item.durationMin ? <span className="block-duration"> · {fmtHM(item.durationMin)}</span> : null}
        </span>
      </div>
      <div className="habit-row-icons">
        <TimerButton kind={kind} id={item.id} logDate={today} />
        <button className="icon-btn" type="button" title="Editar" onClick={() => setEditing(true)}>
          <EditIcon />
        </button>
        <button
          className="icon-btn danger-hover"
          type="button"
          title="Excluir"
          onClick={() => board.deleteRecurringItem(kind, item.id)}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="habit-cells">
        {weekDates.map((d) => {
          const iso = isoFromDate(d);
          const log = item.logs[iso];
          const done = !!log?.checked;
          const trackedMin = log ? Math.round(log.trackedSeconds / 60) : null;
          const title = [
            done && trackedMin != null ? fmtHM(trackedMin) : null,
            log?.note || null,
          ]
            .filter(Boolean)
            .join(" — ");
          return (
            <button
              key={iso}
              type="button"
              className={"habit-cell" + (done ? " done" : "") + (iso === today ? " today" : "") + (log?.note ? " has-note" : "")}
              aria-label={`${item.name} ${iso}`}
              title={title || undefined}
              onClick={(e) =>
                done ? board.clearRecurringDay(kind, item.id, iso) : openDayEditor(iso, e.currentTarget.getBoundingClientRect())
              }
            >
              {fmtDayLabel(d)[0]}
            </button>
          );
        })}
      </div>
      {dayEditor && (
        <DayLogPopover
          anchorRect={dayEditor.rect}
          initialMinutes={
            item.logs[dayEditor.iso] ? Math.round(item.logs[dayEditor.iso].trackedSeconds / 60) : item.durationMin || 0
          }
          initialNote={item.logs[dayEditor.iso]?.note || ""}
          onSave={(minutes, note) => {
            board.commitRecurringDay(kind, item.id, dayEditor.iso, minutes, note);
            setDayEditor(null);
          }}
          onCancel={() => setDayEditor(null)}
        />
      )}
    </div>
  );
}

function RecurringEditRow({ kind, item, onDone }: { kind: Kind; item: RecurringItem; onDone: () => void }) {
  const { board } = useBoardCtx();
  const [name, setName] = useState(item.name);
  const [duration, setDuration] = useState(item.durationMin != null ? String(item.durationMin) : "");

  function save() {
    onDone();
    board.updateRecurring(kind, item.id, name.trim() || item.name, duration ? parseInt(duration, 10) || 0 : null);
  }

  return (
    <div className="edit-row recurring-edit-row">
      <div className="edit-grid">
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <input type="number" min={0} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
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
