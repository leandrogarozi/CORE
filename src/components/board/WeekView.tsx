"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { StatusPicker } from "./StatusPicker";
import { TaskEditRow } from "./TaskRow";
import { fmtDayLabel, isoFromDate, todayISO, weekDatesFrom } from "@/lib/date-utils";
import type { Task } from "@/lib/types";

function DiaDaSemana({ iso, date, hoje, tasks }: { iso: string; date: Date; hoje: boolean; tasks: Task[] }) {
  const { board } = useBoardCtx();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const ordenadas = [...tasks].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || (a.order || 0) - (b.order || 0));

  async function adicionar() {
    const title = novo.trim();
    if (!title) return;
    setNovo("");
    const ok = await board.addTask(iso, title);
    if (!ok) setNovo(title);
  }

  return (
    <section className={"week-card" + (hoje ? " is-today" : "")}>
      <div className="week-card-head">
        <strong>
          {fmtDayLabel(date)} {date.getDate()}
        </strong>
        {hoje && <span className="week-card-hoje">hoje</span>}
        <span className="week-card-n">
          {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>
      {ordenadas.map((t) =>
        editandoId === t.id ? (
          <TaskEditRow key={t.id} task={t} onDone={() => setEditandoId(null)} />
        ) : (
          <div className={"week-task" + (t.done ? " done" : "")} key={t.id}>
            <StatusPicker
              statuses={board.state.taskStatuses}
              currentId={t.statusId}
              onSelect={(statusId) => board.setTaskStatus(t.id, statusId)}
            />
            <button type="button" className="week-task-title" title={t.title} onClick={() => setEditandoId(t.id)}>
              {t.title}
            </button>
            {t.time && <span className="week-task-time mono">{t.time}</span>}
          </div>
        )
      )}
      <input
        type="text"
        id={`qa-week-${iso}`}
        className="week-quickadd"
        placeholder="Adicionar tarefa e pressionar Enter"
        value={novo}
        onChange={(e) => setNovo(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && adicionar()}
        onBlur={adicionar}
      />
    </section>
  );
}

export function WeekView({ weekAnchor }: { weekAnchor: Date }) {
  const { board } = useBoardCtx();
  const today = todayISO();
  const dates = weekDatesFrom(weekAnchor);

  return (
    <div className="week-grid">
      {dates.map((d) => {
        const iso = isoFromDate(d);
        return <DiaDaSemana key={iso} iso={iso} date={d} hoje={iso === today} tasks={board.state.tasks.filter((t) => t.date === iso)} />;
      })}
    </div>
  );
}
