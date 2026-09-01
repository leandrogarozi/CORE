"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { TimerButton } from "./TimerButton";
import { MinutesPicker } from "./TimePicker";
import { EditIcon, TrashIcon } from "./icons";
import { fmtDayLabel, fmtHM, isoFromDate, todayISO, weekDatesFrom } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import type { DayLogEntry, RecurringItem } from "@/lib/types";

type Kind = "habit" | "block";

export function RecurringSection({ kind, weekAnchor }: { kind: Kind; weekAnchor: Date }) {
  const { board } = useBoardCtx();
  const list = kind === "habit" ? board.state.habits : board.state.fixedBlocks;
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState<number | null>(null);
  const sorted = [...list].sort((a, b) => a.order - b.order);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    board.addRecurring(kind, name, newDuration);
    setNewName("");
    setNewDuration(null);
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
        <MinutesPicker className="block-duration-input" minutes={newDuration} onChange={setNewDuration} />
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
  showNote,
  noteOptions,
  onSave,
  onCancel,
}: {
  anchorRect: DOMRect;
  initialMinutes: number;
  initialNote: string;
  showNote: boolean;
  noteOptions: string[];
  onSave: (minutes: number, note: string) => void;
  onCancel: () => void;
}) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [note, setNote] = useState(initialNote);
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.(".time-picker-pop")) return;
      onCancel();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onCancel]);

  function commit() {
    onSave(minutes, note);
  }

  return createPortal(
    <div className="daylog-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
      <label className="edit-field">
        <span className="edit-field-label">Minutos</span>
        <MinutesPicker minutes={minutes} onChange={setMinutes} autoFocus />
      </label>
      {showNote && noteOptions.length > 0 && (
        <label className="edit-field">
          <span className="edit-field-label">Como se sentiu durante a atividade?</span>
          <div className="note-options-chips">
            {noteOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={"note-chip" + (note === opt ? " active" : "")}
                onClick={() => setNote((n) => (n === opt ? "" : opt))}
              >
                {opt}
              </button>
            ))}
          </div>
        </label>
      )}
      {showNote && noteOptions.length === 0 && (
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
      )}
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

function DayViewPopover({
  anchorRect,
  minutes,
  note,
  onEdit,
  onClear,
  onClose,
}: {
  anchorRect: DOMRect;
  minutes: number;
  note: string;
  onEdit: () => void;
  onClear: () => void;
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
    <div className="daylog-popover day-view-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
      <div className="day-view-value">
        <span className="day-view-time">{fmtHM(minutes)}</span>
        {note && <span className="day-view-note">{note}</span>}
      </div>
      <div className="edit-actions">
        <button type="button" className="icon-btn danger-hover" title="Desmarcar" onClick={onClear}>
          <TrashIcon />
        </button>
        <button type="button" className="btn btn-ghost" onClick={onEdit}>
          <EditIcon /> Editar
        </button>
      </div>
    </div>,
    document.body
  );
}

function DayEntriesPopover({
  anchorRect,
  entries,
  noteOptions,
  onAdd,
  onRemove,
  onClose,
}: {
  anchorRect: DOMRect;
  entries: DayLogEntry[];
  noteOptions: string[];
  onAdd: (note: string, minutes: number) => void;
  onRemove: (entryId: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.(".time-picker-pop")) return;
      onClose();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onClose]);

  function toggleSelected(opt: string) {
    setSelected((cur) => (cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]));
  }

  function handleAdd() {
    if (selected.length === 0) return;
    onAdd(selected.join(", "), minutes ?? 0);
    setSelected([]);
    setMinutes(null);
  }

  return createPortal(
    <div className="daylog-popover entries-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
      {entries.length > 0 && (
        <div className="day-entries-list">
          {entries.map((e) => (
            <div key={e.id} className="day-entry-row">
              <span className="day-entry-note">{e.note}</span>
              {e.minutes > 0 && <span className="day-entry-min">{e.minutes}min</span>}
              <button type="button" aria-label={`Remover ${e.note}`} onClick={() => onRemove(e.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="edit-field">
        <span className="edit-field-label">Tipos (pode marcar mais de um)</span>
        <div className="note-options-chips">
          {noteOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              className={"note-chip" + (selected.includes(opt) ? " active" : "")}
              onClick={() => toggleSelected(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </label>
      <label className="edit-field">
        <span className="edit-field-label">Minutos (opcional, vale pra todos marcados)</span>
        <MinutesPicker minutes={minutes} onChange={setMinutes} autoFocus />
      </label>
      <div className="edit-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Fechar
        </button>
        <button type="button" className="btn btn-accent" onClick={handleAdd}>
          Adicionar
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
  const [dayView, setDayView] = useState<{ iso: string; rect: DOMRect } | null>(null);
  const today = todayISO();
  const weekDates = weekDatesFrom(weekAnchor);

  if (editing) {
    return <RecurringEditRow kind={kind} item={item} onDone={() => setEditing(false)} />;
  }

  function openDayEditor(iso: string, rect: DOMRect) {
    setDayEditor({ iso, rect });
  }

  const entriesMode = kind === "block" && (item.noteOptions?.length ?? 0) > 0;
  const showNote = kind === "block" || (item.noteOptions?.length ?? 0) > 0;

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
              onClick={(e) => {
                if (entriesMode) {
                  openDayEditor(iso, e.currentTarget.getBoundingClientRect());
                } else if (done) {
                  setDayView({ iso, rect: e.currentTarget.getBoundingClientRect() });
                } else {
                  openDayEditor(iso, e.currentTarget.getBoundingClientRect());
                }
              }}
            >
              {fmtDayLabel(d)[0]}
            </button>
          );
        })}
      </div>
      {dayEditor && entriesMode && (
        <DayEntriesPopover
          anchorRect={dayEditor.rect}
          entries={item.logs[dayEditor.iso]?.entries ?? []}
          noteOptions={item.noteOptions ?? []}
          onAdd={(note, minutes) => board.addBlockLogEntry(item.id, dayEditor.iso, note, minutes)}
          onRemove={(entryId) => board.deleteBlockLogEntry(item.id, dayEditor.iso, entryId)}
          onClose={() => setDayEditor(null)}
        />
      )}
      {dayView && !entriesMode && (
        <DayViewPopover
          anchorRect={dayView.rect}
          minutes={item.logs[dayView.iso] ? Math.round(item.logs[dayView.iso].trackedSeconds / 60) : 0}
          note={item.logs[dayView.iso]?.note || ""}
          onEdit={() => {
            setDayEditor({ iso: dayView.iso, rect: dayView.rect });
            setDayView(null);
          }}
          onClear={() => {
            board.clearRecurringDay(kind, item.id, dayView.iso);
            setDayView(null);
          }}
          onClose={() => setDayView(null)}
        />
      )}
      {dayEditor && !entriesMode && (
        <DayLogPopover
          anchorRect={dayEditor.rect}
          initialMinutes={
            item.logs[dayEditor.iso] ? Math.round(item.logs[dayEditor.iso].trackedSeconds / 60) : item.durationMin || 0
          }
          initialNote={item.logs[dayEditor.iso]?.note || ""}
          showNote={showNote}
          noteOptions={item.noteOptions ?? []}
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
  const [duration, setDuration] = useState<number | null>(item.durationMin);
  const [options, setOptions] = useState<string[]>(item.noteOptions ?? []);
  const [newOption, setNewOption] = useState("");

  function save() {
    onDone();
    board.updateRecurring(kind, item.id, name.trim() || item.name, duration);
    board.updateRecurringNoteOptions(kind, item.id, options);
  }

  function addOption() {
    const v = newOption.trim();
    if (!v || options.includes(v)) return;
    setOptions((o) => [...o, v]);
    setNewOption("");
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
        <MinutesPicker minutes={duration} onChange={setDuration} />
      </div>
      <div className="note-options-editor">
        <span className="edit-field-label">Opções de nota (marcar em vez de escrever)</span>
        {options.length > 0 && (
          <div className="note-options-chips">
            {options.map((opt) => (
              <span key={opt} className="note-chip removable">
                {opt}
                <button type="button" aria-label={`Remover ${opt}`} onClick={() => setOptions((o) => o.filter((x) => x !== opt))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="note-options-add">
          <input
            type="text"
            placeholder="+ opção (ex.: praia, filme...)"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOption();
              }
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={addOption}>
            Add
          </button>
        </div>
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
