"use client";

import { useBoardCtx } from "./board-context";
import { TaskListCard } from "./TaskListCard";
import { fmtDayLabel, isoFromDate, longLabel, todayISO, weekDatesFrom } from "@/lib/date-utils";

export function WeekView({ weekAnchor }: { weekAnchor: Date }) {
  const { board } = useBoardCtx();
  const today = todayISO();
  const dates = weekDatesFrom(weekAnchor);

  return (
    <div>
      {dates.map((d) => {
        const iso = isoFromDate(d);
        const tasks = board.state.tasks.filter((t) => t.date === iso);
        return (
          <div className="week-day-block" key={iso}>
            <div className={"week-day-heading" + (iso === today ? " is-today" : "")}>
              <span>
                {fmtDayLabel(d)} · {d.getDate()}
              </span>
              <span className="count-inline mono">{tasks.length}</span>
            </div>
            <TaskListCard
              bucketKey={iso}
              tasks={tasks}
              emptyLabel={`Nada em ${longLabel(iso)}.`}
              quickAddId={`qa-week-${iso}`}
              showHeader={false}
            />
          </div>
        );
      })}
    </div>
  );
}
