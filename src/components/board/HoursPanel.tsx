"use client";

import { useBoardCtx } from "./board-context";
import { fmtHM, longLabel, todayISO } from "@/lib/date-utils";
import { CATEGORY_LABEL, type Category } from "@/lib/types";

export function minutesForDate(
  state: ReturnType<typeof useBoardCtx>["board"]["state"],
  iso: string
) {
  const dayTasks = state.tasks.filter((t) => t.date === iso);
  const doneWithDuration = dayTasks.filter((t) => t.done && t.durationMin);
  const taskMin = doneWithDuration.reduce((s, t) => s + (t.durationMin || 0), 0);
  const pendingWithDuration = dayTasks.filter((t) => !t.done && t.durationMin).length;
  const doneNoDuration = dayTasks.filter((t) => t.done && !t.durationMin).length;
  const byCategory: Partial<Record<Category, number>> = {};
  doneWithDuration.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + (t.durationMin || 0);
  });
  const trackedMinutesFor = (item: { logs: Record<string, { checked: boolean; trackedSeconds: number }> }) => {
    const log = item.logs[iso];
    if (!log?.checked) return 0;
    return Math.round(log.trackedSeconds / 60);
  };
  const blockMin = state.fixedBlocks.reduce((s, b) => s + trackedMinutesFor(b), 0);
  const habitMin = state.habits.reduce((s, h) => s + trackedMinutesFor(h), 0);
  return {
    taskMin,
    blockMin,
    habitMin,
    total: taskMin + blockMin + habitMin,
    doneNoDuration,
    pendingWithDuration,
    byCategory,
  };
}

export function HoursPanel({ selectedDate }: { selectedDate: string }) {
  const { board } = useBoardCtx();
  const stats = minutesForDate(board.state, selectedDate);
  const budgetH = board.state.settings.dailyBudgetHours || 12;
  const budgetMin = budgetH * 60;
  const freeMin = budgetMin - stats.total;
  const over = freeMin < 0;
  const pct = budgetMin > 0 ? Math.min(100, (stats.total / budgetMin) * 100) : 0;
  const label = selectedDate === todayISO() ? "Hoje" : longLabel(selectedDate);
  const catKeys = Object.keys(stats.byCategory) as Category[];
  const showBreakdown = catKeys.length > 0 || stats.blockMin > 0 || stats.habitMin > 0;

  return (
    <div className="section hours-section">
      <div className="section-head">
        <span className="section-pill accent">Horas · {label}</span>
      </div>
      <div className="hours-panel">
        <div className="hp-total">
          {fmtHM(stats.total)} <span className="hp-of">de {budgetH}h</span>
        </div>
        <div className="hp-bar">
          <div className={"hp-bar-fill" + (over ? " over" : "")} style={{ width: `${pct}%` }} />
        </div>
        <div className={"hp-free" + (over ? " over" : "")}>
          {over ? `${fmtHM(-freeMin)} acima do previsto` : `${fmtHM(freeMin)} livres`}
        </div>
        {showBreakdown && (
          <div className="hp-breakdown">
            {catKeys.map((cat) => (
              <div className="hp-row" key={cat}>
                <span className="hp-dot" style={{ background: `var(--cat-${cat}-text, var(--text-faint))` }} />
                <span className="hp-row-label">{CATEGORY_LABEL[cat]}</span>
                <span className="mono">{fmtHM(stats.byCategory[cat] || 0)}</span>
              </div>
            ))}
            {stats.habitMin > 0 && (
              <div className="hp-row">
                <span className="hp-dot" style={{ background: "var(--text-faint)" }} />
                <span className="hp-row-label">Hábitos</span>
                <span className="mono">{fmtHM(stats.habitMin)}</span>
              </div>
            )}
            {stats.blockMin > 0 && (
              <div className="hp-row">
                <span className="hp-dot" style={{ background: "var(--text-faint)" }} />
                <span className="hp-row-label">Blocos fixos</span>
                <span className="mono">{fmtHM(stats.blockMin)}</span>
              </div>
            )}
          </div>
        )}
        {!showBreakdown && (
          <div className="hp-empty">
            O painel conta tarefas concluídas (com duração), e hábitos/blocos fixos marcados no dia.
          </div>
        )}
        {stats.doneNoDuration > 0 && (
          <div className="hp-note">
            {stats.doneNoDuration}
            {stats.doneNoDuration === 1
              ? " tarefa concluída sem duração definida — clique nela e preencha a duração para contar aqui."
              : " tarefas concluídas sem duração definida — clique nelas e preencham a duração para contarem aqui."}
          </div>
        )}
        {stats.pendingWithDuration > 0 && (
          <div className="hp-note">
            {stats.pendingWithDuration}
            {stats.pendingWithDuration === 1
              ? " tarefa com duração ainda não concluída — entra na conta quando marcar como feita."
              : " tarefas com duração ainda não concluídas — entram na conta quando marcar como feitas."}
          </div>
        )}
      </div>
    </div>
  );
}
