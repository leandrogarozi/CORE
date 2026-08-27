"use client";

import { useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";
import { isoFromDate, monthAnchorOf, monthGridDates, todayISO, MONTH_NAMES_FULL, DAY_NAMES } from "@/lib/date-utils";

export function CalendarView({
  onBack,
  onSelectWeek,
  onSelectDay,
}: {
  onBack: () => void;
  onSelectWeek: () => void;
  onSelectDay: (iso: string) => void;
}) {
  const { board } = useBoardCtx();
  const [monthAnchor, setMonthAnchor] = useState(() => monthAnchorOf(new Date()));
  const today = todayISO();
  const statuses = useMemo(() => [...board.state.taskStatuses].sort((a, b) => a.order - b.order), [board.state.taskStatuses]);

  const cells = useMemo(() => {
    return monthGridDates(monthAnchor).map((d) => {
      const iso = isoFromDate(d);
      const dayTasks = board.state.tasks.filter((t) => t.date === iso);
      const chips = statuses
        .map((st) => ({ id: st.id, color: st.color, count: dayTasks.filter((t) => t.statusId === st.id).length }))
        .filter((c) => c.count > 0);
      return { iso, dayNum: d.getDate(), inMonth: d.getMonth() === monthAnchor.getMonth(), chips };
    });
  }, [monthAnchor, board.state.tasks, statuses]);

  function prevMonth() {
    setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }
  function goToday() {
    setMonthAnchor(monthAnchorOf(new Date()));
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Calendário</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="cal-toolbar">
        <button className="today-btn" type="button" onClick={goToday}>
          Hoje
        </button>
        <div className="cal-month-nav">
          <button className="strip-nav" type="button" aria-label="mês anterior" onClick={prevMonth}>
            ‹
          </button>
          <span className="cal-month-label mono">
            {MONTH_NAMES_FULL[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
          </span>
          <button className="strip-nav" type="button" aria-label="próximo mês" onClick={nextMonth}>
            ›
          </button>
        </div>
        <div className="view-toggle">
          <button type="button" className="view-toggle-btn active">
            Mês
          </button>
          <button type="button" className="view-toggle-btn" onClick={onSelectWeek}>
            Semana
          </button>
        </div>
      </div>

      <div className="cal-grid">
        <div className="cal-weekday-row">
          {DAY_NAMES.map((d) => (
            <span key={d} className="cal-weekday">
              {d}
            </span>
          ))}
        </div>
        <div className="cal-days">
          {cells.map((cell) => (
            <button
              key={cell.iso}
              type="button"
              className={"cal-day" + (cell.inMonth ? "" : " outside") + (cell.iso === today ? " today" : "")}
              onClick={() => onSelectDay(cell.iso)}
            >
              <span className="cal-day-num">{cell.dayNum}</span>
              {cell.chips.length > 0 && (
                <div className="cal-day-chips">
                  {cell.chips.map((c) => (
                    <span key={c.id} className="cal-day-chip" style={{ background: c.color }}>
                      {c.count}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
