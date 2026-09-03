"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BoardProvider, useBoardCtx } from "./board-context";
import { DayStrip } from "./DayStrip";
import { TaskListCard } from "./TaskListCard";
import { WeekView } from "./WeekView";
import { CalendarView } from "./CalendarView";
import { TaskSearch, type SearchResult } from "./TaskSearch";
import { Dashboard } from "./Dashboard";
import { HoursPanel } from "./HoursPanel";
import { DailyLogPanel } from "./DailyLogPanel";
import { RecurringSection } from "./RecurringSection";
import { SettingsView } from "./SettingsView";
import { BooksView } from "./BooksView";
import { RemindersView, RemindersButton } from "./RemindersView";
import { MedicationsView } from "./MedicationsView";
import { ChecklistsView } from "./ChecklistsView";
import { DietView } from "./DietView";
import { ProjectsView } from "./ProjectsView";
import { MeetingsView } from "./MeetingsView";
import { TrashView } from "./TrashView";
import { ScopeModal } from "./ScopeModal";
import { ConfirmModal } from "./ConfirmModal";
import { FaroMascot } from "./FaroMascot";
import { ActiveTimerBadge } from "./TimerButton";
import { ProfileView } from "./ProfileView";
import { MeetingButton } from "./MeetingButton";
import { TimerNudges } from "./TimerNudges";
import { Sidebar, type ViewMode } from "./Sidebar";
import { SaveErrorToaster } from "./SaveErrorToaster";
import { MenuIcon, SettingsIcon, UserIcon, WarningIcon, WeekIcon } from "./icons";
import { dateFromISO, longLabel, mondayOf, todayISO } from "@/lib/date-utils";
import type { Task } from "@/lib/types";

function BoardShell() {
  const { board, sortByQuick, setSortByQuick, setOpenProjectHandler, requestFocus } = useBoardCtx();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  function selectView(mode: ViewMode) {
    if (mode === "day") {
      setWeekAnchor(mondayOf(new Date()));
      setSelectedDate(todayISO());
    }
    if (mode === "projects") setSelectedProjectId(null);
    setViewMode(mode);
    setSidebarOpen(false);
  }

  function goToProject(projectId: string) {
    setSelectedProjectId(projectId);
    setViewMode("projects");
  }

  useEffect(() => {
    setOpenProjectHandler(() => goToProject);
    return () => setOpenProjectHandler(null);
  }, [setOpenProjectHandler]);

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

  function handleSearchNavigate(result: SearchResult) {
    if (result.kind === "task") {
      goToTask(result.task);
      requestFocus({ kind: "task", id: result.task.id });
    } else if (result.kind === "reminder") {
      setViewMode("reminders");
      requestFocus({ kind: "reminder", id: result.reminder.id });
    } else if (result.kind === "book") {
      setViewMode("books");
      requestFocus({ kind: "book", id: result.book.id });
    }
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

  // Avisa antes de fechar/recarregar se algum campo "+ adicionar" (tarefa, lembrete,
  // etapa de projeto...) tiver texto digitado e ainda não confirmado (Enter) — sem
  // isso, fechar a aba nesse meio tempo perde o texto sem deixar rastro nenhum.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const hasUnsavedQuickAdd = Array.from(document.querySelectorAll<HTMLInputElement>(".quickadd-input")).some(
        (el) => el.value.trim() !== ""
      );
      if (!hasUnsavedQuickAdd) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const backlogTasks = board.state.tasks.filter((t) => !t.date);
  const dayTasks = board.state.tasks.filter((t) => t.date === selectedDate);

  return (
    <div className="wrap">
      <SaveErrorToaster />
      <Sidebar open={sidebarOpen} viewMode={viewMode} onSelect={selectView} onClose={() => setSidebarOpen(false)} />

      <div className="topbar">
        <button className="icon-btn menu-btn" type="button" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
          <MenuIcon />
        </button>
        <div className="brand">FARO</div>
        <TaskSearch onNavigate={handleSearchNavigate} />
        <div className="topbar-right">
          <MeetingButton />
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
      <ConfirmModal />
      <TimerNudges />

      {viewMode === "settings" ? (
        <SettingsView onBack={() => setViewMode("day")} />
      ) : viewMode === "profile" ? (
        <ProfileView onBack={() => setViewMode("day")} />
      ) : viewMode === "books" ? (
        <BooksView onBack={() => setViewMode("day")} />
      ) : viewMode === "reminders" ? (
        <RemindersView onBack={() => setViewMode("day")} onOpenMeetings={() => setViewMode("meetings")} />
      ) : viewMode === "medications" ? (
        <MedicationsView onBack={() => setViewMode("day")} />
      ) : viewMode === "checklists" ? (
        <ChecklistsView onBack={() => setViewMode("day")} />
      ) : viewMode === "diet" ? (
        <DietView onBack={() => setViewMode("day")} />
      ) : viewMode === "trash" ? (
        <TrashView onBack={() => setViewMode("day")} />
      ) : viewMode === "projects" ? (
        <ProjectsView
          onBack={() => setViewMode("day")}
          selectedId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />
      ) : viewMode === "meetings" ? (
        <MeetingsView onBack={() => setViewMode("day")} />
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
              <span className="section-pill warning">
                <WarningIcon /> Sem data<span className="count">{backlogTasks.length}</span>
              </span>
            </div>
            <div className="hint-text">Coloque uma data pra essas tarefas não ficarem esquecidas por aqui.</div>
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
                <span className="section-pill accent">Dia a Dia</span>
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
