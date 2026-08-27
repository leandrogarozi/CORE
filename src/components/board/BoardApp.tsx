"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BoardProvider, useBoardCtx } from "./board-context";
import { DayStrip } from "./DayStrip";
import { TaskListCard } from "./TaskListCard";
import { WeekView } from "./WeekView";
import { CalendarView } from "./CalendarView";
import { TaskSearch } from "./TaskSearch";
import { Dashboard } from "./Dashboard";
import { HoursPanel } from "./HoursPanel";
import { DailyLogPanel } from "./DailyLogPanel";
import { RecurringSection } from "./RecurringSection";
import { SettingsView } from "./SettingsView";
import { BooksView } from "./BooksView";
import { RemindersView, RemindersButton } from "./RemindersView";
import { MedicationsView } from "./MedicationsView";
import { ScopeModal } from "./ScopeModal";
import { FaroMascot } from "./FaroMascot";
import { ActiveTimerBadge } from "./TimerButton";
import { ProfileView } from "./ProfileView";
import { Sidebar, type ViewMode } from "./Sidebar";
import { MenuIcon, SettingsIcon, UserIcon, WeekIcon } from "./icons";
import { dateFromISO, longLabel, mondayOf, todayISO } from "@/lib/date-utils";
import type { Task } from "@/lib/types";

function BoardShell() {
  const { board, sortByQuick, setSortByQuick } = useBoardCtx();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayISO());

  function selectView(mode: ViewMode) {
    if (mode === "day") {
      setWeekAnchor(mondayOf(new Date()));
      setSelectedDate(todayISO());
    }
    setViewMode(mode);
    setSidebarOpen(false);
  }

  function goToday() {
    setWeekAnchor(mondayOf(new Date()));
    setSelectedDate(todayISO());
    setViewMode("day");
  }

  function goToDate(iso: string) {
    setSelectedDate(iso);
    setWeekAnchor(mondayOf(dateFromISO(iso)));
    setViewMode("day");
  }

  function goToTask(task: Task) {
    if (task.date) goToDate(task.date);
    else setViewMode("day");
  }

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
      <Sidebar open={sidebarOpen} viewMode={viewMode} onSelect={selectView} onClose={() => setSidebarOpen(false)} />

      <div className="topbar">
        <button className="icon-btn menu-btn" type="button" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
          <MenuIcon />
        </button>
        <div className="brand">FARO</div>
        <TaskSearch onNavigate={goToTask} />
        <div className="topbar-right">
          <ActiveTimerBadge />
          <div className="today-date mono">{longLabel(todayISO())}</div>
          <button className="today-btn" type="button" onClick={goToday}>
            Hoje
          </button>
          <button
            className={"icon-btn" + (viewMode === "calendar" ? " active" : "")}
            type="button"
            aria-label="Abrir calendário"
            title="Calendário"
            onClick={() => setViewMode("calendar")}
          >
            <WeekIcon />
          </button>
          <button
            className={"icon-btn settings-btn" + (viewMode === "settings" ? " active" : "")}
            id="settings-btn"
            type="button"
            aria-label="Configurações"
            onClick={() => setViewMode(viewMode === "settings" ? "day" : "settings")}
          >
            <SettingsIcon />
          </button>
          <button
            className={"profile-avatar-nav-btn" + (viewMode === "profile" ? " active" : "")}
            type="button"
            aria-label="Perfil"
            title="Perfil"
            onClick={() => setViewMode(viewMode === "profile" ? "day" : "profile")}
          >
            {board.state.settings.avatarUrl ? (
              <Image src={board.state.settings.avatarUrl} alt="" fill sizes="26px" className="profile-avatar-nav-img" />
            ) : (
              <UserIcon />
            )}
          </button>
        </div>
      </div>

      <ScopeModal />

      {viewMode === "settings" ? (
        <SettingsView onBack={() => setViewMode("day")} />
      ) : viewMode === "profile" ? (
        <ProfileView onBack={() => setViewMode("day")} />
      ) : viewMode === "books" ? (
        <BooksView onBack={() => setViewMode("day")} />
      ) : viewMode === "reminders" ? (
        <RemindersView onBack={() => setViewMode("day")} />
      ) : viewMode === "medications" ? (
        <MedicationsView onBack={() => setViewMode("day")} />
      ) : viewMode === "calendar" ? (
        <CalendarView onBack={() => setViewMode("day")} onSelectWeek={() => setViewMode("week")} onSelectDay={goToDate} />
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
                onClick={goToday}
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
            <RemindersButton onOpenFull={() => setViewMode("reminders")} />
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
              <span className="section-pill accent">
                Sem data<span className="count">{backlogTasks.length}</span>
              </span>
            </div>
            <TaskListCard bucketKey="" tasks={backlogTasks} emptyLabel="Backlog vazio." quickAddId="qa-backlog" />
          </div>

          <div className="habits-blocks-row">
            <div className="section">
              <div className="section-head">
                <span className="section-pill accent">Hábitos</span>
              </div>
              <div className="hint-text">
                Aperte o play pra cronometrar em tempo real, ou preencha uma duração fixa e marque o check
                manualmente.
              </div>
              <RecurringSection kind="habit" weekAnchor={weekAnchor} />
            </div>

            <div className="section">
              <div className="section-head">
                <span className="section-pill accent">Blocos fixos do dia</span>
              </div>
              <div className="hint-text">
                Coisas que costumam ocupar tempo todo dia (almoço, deslocamento, academia...). Aperte o play na hora
                que for fazer, ou marque o dia manualmente pra usar uma duração fixa.
              </div>
              <RecurringSection kind="block" weekAnchor={weekAnchor} />
            </div>
          </div>
        </>
      )}

      <FaroMascot />
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
