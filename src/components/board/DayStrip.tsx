"use client";

import { DAY_NAMES, isoFromDate, todayISO, weekDatesFrom } from "@/lib/date-utils";

export function DayStrip({
  weekAnchor,
  selectedDate,
  onSelectDate,
}: {
  weekAnchor: Date;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
}) {
  const today = todayISO();
  const dates = weekDatesFrom(weekAnchor);
  return (
    <div className="day-strip">
      {dates.map((d) => {
        const iso = isoFromDate(d);
        return (
          <button
            key={iso}
            type="button"
            className={"day-chip" + (iso === today ? " is-today" : "") + (iso === selectedDate ? " selected" : "")}
            onClick={() => onSelectDate(iso)}
          >
            <span className="day-chip-name">{DAY_NAMES[d.getDay()]}</span>
            <span className="day-chip-num mono">{d.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
