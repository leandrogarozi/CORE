"use client";

import { useState } from "react";
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

function RecurringRow({ kind, item, weekAnchor }: { kind: Kind; item: RecurringItem; weekAnchor: Date }) {
  const { board } = useBoardCtx();
  const [editing, setEditing] = useState(false);
  const [dayEditIso, setDayEditIso] = useState<string | null>(null);
  const [minutesInput, setMinutesInput] = useState("0");
  const today = todayISO();
  const weekDates = weekDatesFrom(weekAnchor);

  if (editing) {
    return <RecurringEditRow kind={kind} item={item} onDone={() => setEditing(false)} />;
  }

  function openDayEditor(iso: string) {
    const log = item.logs[iso];
    const existingMin = log ? Math.round(log.trackedSeconds / 60) : item.durationMin || 0;
    setMinutesInput(String(existingMin));
    setDayEditIso(iso);
  }

  function commit() {
    if (!dayEditIso) return;
    let minutes = parseInt(minutesInput, 10);
    if (isNaN(minutes) || minutes < 0) minutes = 0;
    board.commitRecurringDay(kind, item.id, dayEditIso, minutes);
    setDayEditIso(null);
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
          if (dayEditIso === iso) {
            return (
              <input
                key={iso}
                type="number"
                min={0}
                step={5}
                autoFocus
                className="habit-cell-input mono"
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  else if (e.key === "Escape") setDayEditIso(null);
                }}
                onBlur={commit}
              />
            );
          }
          const trackedMin = log ? Math.round(log.trackedSeconds / 60) : null;
          return (
            <button
              key={iso}
              type="button"
              className={"habit-cell" + (done ? " done" : "") + (iso === today ? " today" : "")}
              aria-label={`${item.name} ${iso}`}
              title={done && trackedMin != null ? fmtHM(trackedMin) : undefined}
              onClick={() => (done ? board.clearRecurringDay(kind, item.id, iso) : openDayEditor(iso))}
            >
              {fmtDayLabel(d)[0]}
            </button>
          );
        })}
      </div>
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
