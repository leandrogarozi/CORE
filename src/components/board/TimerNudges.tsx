"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { BellIcon, CheckIcon, PlayIcon, SendIcon } from "./icons";
import { todayISO } from "@/lib/date-utils";
import { isReminderAlerting } from "@/lib/board/reminder-alerts";

export function TimerNudges() {
  const { board } = useBoardCtx();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [dismissedOverdueId, setDismissedOverdueId] = useState<string | null>(null);
  const [dismissedUpcoming, setDismissedUpcoming] = useState<Set<string>>(new Set());
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
  const [dismissedDietMeals, setDismissedDietMeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const h = setInterval(tick, 20000);
    return () => clearInterval(h);
  }, []);

  const at = board.state.activeTimer;
  const activeTask = at?.kind === "task" ? board.state.tasks.find((t) => t.id === at.itemId) : null;

  let overdueBanner: React.ReactNode = null;
  if (nowMs !== null && at && activeTask && activeTask.expectedDurationMin && dismissedOverdueId !== activeTask.id) {
    const elapsedMin = Math.floor((nowMs - at.startedAt) / 60000);
    if (elapsedMin >= activeTask.expectedDurationMin) {
      overdueBanner = (
        <div className="timer-nudge" key="overdue">
          <span className="timer-nudge-text">
            <BellIcon filled />
            &ldquo;{activeTask.title}&rdquo; já passou dos {activeTask.expectedDurationMin}min previstos. Terminou?
          </span>
          <div className="timer-nudge-actions">
            <button type="button" className="btn btn-accent" onClick={() => board.concludeMeeting(activeTask.id)}>
              <CheckIcon /> Concluir
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => board.bumpExpectedDuration(activeTask.id, 15)}>
              +15min
            </button>
            <button
              type="button"
              className="icon-btn timer-nudge-close"
              onClick={() => setDismissedOverdueId(activeTask.id)}
              aria-label="Dispensar"
            >
              ×
            </button>
          </div>
        </div>
      );
    }
  }

  const today = todayISO();
  let upcoming: (typeof board.state.tasks)[number] | undefined;
  if (nowMs !== null) {
    const now = new Date(nowMs);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    upcoming = board.state.tasks.find((t) => {
      if (t.date !== today || !t.time || t.done) return false;
      if (dismissedUpcoming.has(t.id)) return false;
      if (at?.kind === "task" && at.itemId === t.id) return false;
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
  if (nowMs !== null) {
    const now = new Date(nowMs);
    nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  const dietBanners =
    nowHM !== null
      ? board.state.dietMeals
          .filter(
            (m) => m.active && nowHM! >= m.time && !dietMealsChecked.includes(m.id) && !dismissedDietMeals.has(m.id)
          )
          .map((m) => (
            <div className="timer-nudge" key={`diet-${m.id}`}>
              <span className="timer-nudge-text">
                <BellIcon filled />
                🎯 Foco na dieta — {m.name}
                {m.message ? `: ${m.message}` : ""}
              </span>
              <div className="timer-nudge-actions">
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => board.toggleDietMealChecked(today, m.id)}
                >
                  <CheckIcon /> Marquei
                </button>
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

  if (!overdueBanner && !upcomingBanner && reminderBanners.length === 0 && dietBanners.length === 0) return null;

  return (
    <div className="timer-nudge-stack">
      {overdueBanner}
      {upcomingBanner}
      {reminderBanners}
      {dietBanners}
    </div>
  );
}
