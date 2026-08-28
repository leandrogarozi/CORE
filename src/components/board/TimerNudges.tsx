"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { BellIcon, CheckIcon, PlayIcon, SendIcon } from "./icons";
import { todayISO } from "@/lib/date-utils";
import { isReminderAlerting } from "@/lib/board/reminder-alerts";

export function TimerNudges() {
  const { board } = useBoardCtx();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [dismissedOverdue, setDismissedOverdue] = useState<Set<string>>(new Set());
  const [dismissedUpcoming, setDismissedUpcoming] = useState<Set<string>>(new Set());
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
  const [dismissedDietMeals, setDismissedDietMeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const h = setInterval(tick, 20000);
    return () => clearInterval(h);
  }, []);

  const activeTaskTimers =
    nowMs !== null
      ? board.state.activeTimers.filter((at) => at.kind === "task").flatMap((at) => {
          const task = board.state.tasks.find((t) => t.id === at.itemId);
          if (!task || !task.expectedDurationMin || dismissedOverdue.has(task.id)) return [];
          const elapsedMin = Math.floor((nowMs! - at.startedAt) / 60000);
          if (elapsedMin < task.expectedDurationMin) return [];
          return [{ at, task }];
        })
      : [];

  const overdueBanners = activeTaskTimers.map(({ task }) => (
    <div className="timer-nudge" key={`overdue-${task.id}`}>
      <span className="timer-nudge-text">
        <BellIcon filled />
        &ldquo;{task.title}&rdquo; já passou dos {task.expectedDurationMin}min previstos. Terminou?
      </span>
      <div className="timer-nudge-actions">
        <button type="button" className="btn btn-accent" onClick={() => board.concludeMeeting(task.id)}>
          <CheckIcon /> Concluir
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => board.bumpExpectedDuration(task.id, 15)}>
          +15min
        </button>
        <button
          type="button"
          className="icon-btn timer-nudge-close"
          onClick={() => setDismissedOverdue((s) => new Set(s).add(task.id))}
          aria-label="Dispensar"
        >
          ×
        </button>
      </div>
    </div>
  ));

  const today = todayISO();
  let upcoming: (typeof board.state.tasks)[number] | undefined;
  if (nowMs !== null) {
    const now = new Date(nowMs);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    upcoming = board.state.tasks.find((t) => {
      if (t.date !== today || !t.time || t.done) return false;
      if (dismissedUpcoming.has(t.id)) return false;
      if (board.state.activeTimers.some((at) => at.kind === "task" && at.itemId === t.id)) return false;
      const [hh, mm] = t.time.split(":").map(Number);
      const taskMin = hh * 60 + mm;
      return nowMin >= taskMin - 5 && nowMin < taskMin;
    });
  }

  const upcomingBanner = upcoming ? (
    <div className="timer-nudge" key="upcoming">
      <span className="timer-nudge-text">
        <BellIcon filled />
        &ldquo;{upcoming.title}&rdquo; começa às {upcoming.time} — iniciar o cronômetro?
      </span>
      <div className="timer-nudge-actions">
        <button type="button" className="btn btn-accent" onClick={() => board.toggleTimer("task", upcoming.id, today)}>
          <PlayIcon /> Iniciar
        </button>
        <button
          type="button"
          className="icon-btn timer-nudge-close"
          onClick={() => setDismissedUpcoming((s) => new Set(s).add(upcoming.id))}
          aria-label="Dispensar"
        >
          ×
        </button>
      </div>
    </div>
  ) : null;

  const reminderBanners =
    nowMs !== null
      ? board.state.reminders
          .filter((r) => !dismissedReminders.has(r.id) && isReminderAlerting(r, nowMs))
          .map((r) => (
            <div className="timer-nudge" key={`reminder-${r.id}`}>
              <span className="timer-nudge-text">
                <BellIcon filled />
                Lembrete: &ldquo;{r.title}&rdquo;
                {r.date ? ` — ${r.date.split("-").reverse().join("/")}` : ""}
                {r.time ? ` às ${r.time}` : ""}
              </span>
              <div className="timer-nudge-actions">
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => board.updateReminder(r.id, { done: true })}
                >
                  <CheckIcon /> Concluir
                </button>
                <button
                  type="button"
                  className="icon-btn timer-nudge-close"
                  onClick={() => setDismissedReminders((s) => new Set(s).add(r.id))}
                  aria-label="Dispensar"
                >
                  ×
                </button>
              </div>
            </div>
          ))
      : [];

  const dietMealsChecked = board.state.dailyLogs[today]?.dietMealsChecked ?? [];
  let nowHM: string | null = null;
  let nowWeekDay: number | null = null;
  if (nowMs !== null) {
    const now = new Date(nowMs);
    nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    nowWeekDay = now.getDay();
  }
  const dietBanners =
    nowHM !== null && board.state.settings.dietAppOptIn
      ? board.state.dietMeals
          .filter(
            (m) =>
              m.active &&
              nowHM! >= m.time &&
              (!m.weekDays || m.weekDays.length === 0 || m.weekDays.includes(nowWeekDay!)) &&
              !dietMealsChecked.includes(m.id) &&
              !dismissedDietMeals.has(m.id)
          )
          .map((m) => (
            <div className="timer-nudge" key={`diet-${m.id}`}>
              <span className="timer-nudge-text">
                <BellIcon filled />
                🎯 Foco na dieta — {m.name}
                {m.message ? `: ${m.message}` : ""}
              </span>
              <div className="timer-nudge-actions">
                {board.state.settings.dietWhatsappOptIn && m.notifyWhatsapp && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Enviar por WhatsApp"
                    onClick={() => {
                      const text = m.message.trim() || `${m.name} — hora da refeição!`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <SendIcon />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn timer-nudge-close"
                  onClick={() => setDismissedDietMeals((s) => new Set(s).add(m.id))}
                  aria-label="Dispensar"
                >
                  ×
                </button>
              </div>
            </div>
          ))
      : [];

  if (overdueBanners.length === 0 && !upcomingBanner && reminderBanners.length === 0 && dietBanners.length === 0) {
    return null;
  }

  return (
    <div className="timer-nudge-stack">
      {overdueBanners}
      {upcomingBanner}
      {reminderBanners}
      {dietBanners}
    </div>
  );
}
