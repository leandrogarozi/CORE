"use client";

import { useEffect, useMemo, useState } from "react";
import { BoardProvider, useBoardCtx } from "./board-context";
import { DayStrip } from "./DayStrip";
import { TaskListCard } from "./TaskListCard";
import { WeekView } from "./WeekView";
import { Dashboard } from "./Dashboard";
import { HoursPanel } from "./HoursPanel";
import { DailyLogPanel } from "./DailyLogPanel";
import { RecurringSection } from "./RecurringSection";
import { SettingsView } from "./SettingsView";
import { ScopeModal } from "./ScopeModal";
import { ActiveTimerBadge } from "./TimerButton";
import { SettingsIcon } from "./icons";
import { longLabel, mondayOf, todayISO } from "@/lib/date-utils";

type ViewMode = "day" | "week" | "dashboard" | "settings";

function BoardShell() {
  const { board, sortByQuick, setSortByQuick } = useBoardCtx();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayISO());

  const weekDatesISO = useMemo(() => {
    const from = new Date(weekAnchor);
    const to = new Date(weekAnchor);
    to.setDate(to.getDate() + 6);
    return { fromISO: from.toISOString().slice(0, 10), toISO: to.toISOString().slice(0, 10) };
  }, [weekAnchor]);

  useEffect(() => {
    if (!board.loading) board.ensureOccurrencesInView(weekDatesISO.fromISO, weekDatesISO.toISO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.loading, weekDatesISO.fromISO, weekDatesISO.toISO]);

  const backlogTasks = board.state.tasks.filter((t) => !t.date);
  const dayTasks = board.state.tasks.filter((t) => t.date === selectedDate);

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">FARO</div>
        <div className="topbar-right">
          <ActiveTimerBadge />
          <div className="today-date mono">{longLabel(todayISO())}</div>
          <button
            className={"icon-btn settings-btn" + (viewMode === "settings" ? " active" : "")}
            id="settings-btn"
            type="button"
            aria-label="Configurações"
            onClick={() => setViewMode(viewMode === "settings" ? "day" : "settings")}
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      <ScopeModal />

      {viewMode === "settings" ? (
        <SettingsView onBack={() => setViewMode("day")} />
      ) : (
        <>
          <div className="day-strip-wrap">
            <button
              className="strip-nav"
              type="button"
              aria-label="semana anterior"
              onClick={() => {
                const d = new Date(weekAnchor);
                d.setDate(d.getDate() - 7);
                setWeekAnchor(d);
              }}
            >
              ‹
            </button>
            <DayStrip weekAnchor={weekAnchor} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <button
              className="strip-nav"
              type="button"
              aria-label="próxima semana"
              onClick={() => {
                const d = new Date(weekAnchor);
                d.setDate(d.getDate() + 7);
                setWeekAnchor(d);
              }}
            >
              ›
            </button>
            <div className="view-toggle">
              <button
                type="button"
                className={"view-toggle-btn" + (viewMode !== "week" && viewMode !== "dashboard" ? " active" : "")}
                onClick={() => {
                  setWeekAnchor(mondayOf(new Date()));
                  setSelectedDate(todayISO());
                  setViewMode("day");
                }}
              >
                Hoje
              </button>
              <button
                type="button"
                className={"view-toggle-btn" + (viewMode === "week" ? " active" : "")}
                onClick={() => setViewMode(viewMode === "week" ? "day" : "week")}
              >
                Semana
              </button>
              <button
                type="button"
                className={"view-toggle-btn" + (viewMode === "dashboard" ? " active" : "")}
                onClick={() => setViewMode(viewMode === "dashboard" ? "day" : "dashboard")}
              >
                Dashboard
              </button>
            </div>
          </div>

          {viewMode === "dashboard" ? (
            <Dashboard />
          ) : (
            <div className="day-layout">
              <div className="section">
                <div className="section-head">
                  <span className="section-pill accent">
                    {viewMode === "week" ? "Semana" : selectedDate === todayISO() ? "Hoje" : longLabel(selectedDate)}
                    <span className="count">
                      {viewMode === "week" ? board.state.tasks.filter((t) => t.date).length : dayTasks.length}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={"quicksort-btn" + (sortByQuick ? " active" : "")}
                    title="Reordena as listas colocando as tarefas mais rápidas (+++) primeiro"
                    onClick={() => setSortByQuick(!sortByQuick)}
                  >
                    ⚡ Rápidas primeiro
                  </button>
                </div>
                {viewMode === "week" ? (
                  <WeekView weekAnchor={weekAnchor} />
                ) : (
                  <TaskListCard
                    bucketKey={selectedDate}
                    tasks={dayTasks}
                    emptyLabel={`Nada marcado para ${longLabel(selectedDate)}.`}
                    quickAddId="qa-day"
                  />
                )}
              </div>
              <div className="day-below-row">
                <HoursPanel selectedDate={selectedDate} />
                {viewMode === "day" && <DailyLogPanel selectedDate={selectedDate} />}
              </div>
            </div>
          )}

          <div className="section">
            <div className="section-head">
              <span className="section-pill">
                Sem data<span className="count">{backlogTasks.length}</span>
              </span>
            </div>
            <TaskListCard bucketKey="" tasks={backlogTasks} emptyLabel="Backlog vazio." quickAddId="qa-backlog" />
          </div>

          <div className="section">
            <div className="section-head">
              <span className="section-pill">Hábitos</span>
            </div>
            <div className="hint-text">
              Aperte o play pra cronometrar em tempo real, ou preencha uma duração fixa e marque o check manualmente.
            </div>
            <RecurringSection kind="habit" weekAnchor={weekAnchor} />
          </div>

          <div className="section">
            <div className="section-head">
              <span className="section-pill">Blocos fixos do dia</span>
            </div>
            <div className="hint-text">
              Coisas que costumam ocupar tempo todo dia (almoço, deslocamento, academia...). Aperte o play na hora
              que for fazer, ou marque o dia manualmente pra usar uma duração fixa.
            </div>
            <RecurringSection kind="block" weekAnchor={weekAnchor} />
          </div>
        </>
      )}

      <div className="top-actions">
        <form action="/auth/signout" method="post">
          <button type="submit" className="signout-btn">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

export function BoardApp({ userId }: { userId: string }) {
  return (
    <BoardProvider userId={userId}>
      <BoardShell />
    </BoardProvider>
  );
}
