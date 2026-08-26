"use client";

import { useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";
import {
  MONTH_NAMES_FULL,
  fmtHM,
  isoAddDays,
  isoFromDate,
  mondayOf,
  monthAnchorOf,
  todayISO,
  weekDatesFrom,
} from "@/lib/date-utils";
import { CATEGORY_LABEL, type Category, type Priority, type Task } from "@/lib/types";
import { TaskListModal } from "./TaskListModal";

type Period = "week" | "month";

const CAT_COLORS: Record<Category, string> = {
  trabalho: "#B0581A",
  estudo: "#226C9C",
  dev: "#6C4296",
  saude: "#277644",
  pessoal: "#A23E68",
  familia: "#1B7F79",
};

function rangeForPeriod(period: Period, weekAnchor: Date, monthAnchor: Date) {
  if (period === "week") {
    const dates = weekDatesFrom(weekAnchor);
    return { fromISO: isoFromDate(dates[0]), toISO: isoFromDate(dates[6]) };
  }
  const y = monthAnchor.getFullYear();
  const m = monthAnchor.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return { fromISO: isoFromDate(new Date(y, m, 1)), toISO: isoFromDate(new Date(y, m, lastDay)) };
}

function rangeLabel(period: Period, weekAnchor: Date, monthAnchor: Date) {
  if (period === "month") return `${MONTH_NAMES_FULL[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;
  const dates = weekDatesFrom(weekAnchor);
  const a = dates[0];
  const b = dates[6];
  return `${a.getDate()}/${a.getMonth() + 1} – ${b.getDate()}/${b.getMonth() + 1}`;
}

function eachDateInRange(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  let cur = fromISO;
  let guard = 0;
  while (cur <= toISO && guard < 400) {
    out.push(cur);
    cur = isoAddDays(cur, 1);
    guard++;
  }
  return out;
}

export function Dashboard() {
  const { board } = useBoardCtx();
  const [period, setPeriod] = useState<Period>("week");
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => monthAnchorOf(new Date()));

  const { fromISO, toISO } = rangeForPeriod(period, weekAnchor, monthAnchor);
  const today = todayISO();

  const [modal, setModal] = useState<{ title: string; tasks: Task[] } | null>(null);

  const stats = useMemo(() => {
    const s = board.state;
    const overdueTasks = s.tasks.filter((t) => !t.done && t.date && t.date < today);
    const overdueCount = overdueTasks.length;
    const noDateCount = s.tasks.filter((t) => !t.date).length;
    const doneInPeriod = s.tasks.filter((t) => t.done && t.date && t.date >= fromISO && t.date <= toISO);
    const pendingInPeriod = s.tasks.filter((t) => !t.done && t.date && t.date >= fromISO && t.date <= toISO);

    const byCategory: Partial<Record<Category, number>> = {};
    let taskMinTotal = 0;
    doneInPeriod.forEach((t) => {
      if (t.durationMin) {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.durationMin;
        taskMinTotal += t.durationMin;
      }
    });

    const days = eachDateInRange(fromISO, toISO);
    const habitStats = s.habits
      .map((h) => ({
        id: h.id,
        name: h.name,
        min: days.reduce((sum, iso) => sum + (h.logs[iso]?.checked ? Math.round(h.logs[iso].trackedSeconds / 60) : 0), 0),
        count: days.filter((iso) => h.logs[iso]?.checked).length,
      }))
      .filter((x) => x.min > 0 || x.count > 0);
    const blockStats = s.fixedBlocks
      .map((b) => ({
        id: b.id,
        name: b.name,
        min: days.reduce((sum, iso) => sum + (b.logs[iso]?.checked ? Math.round(b.logs[iso].trackedSeconds / 60) : 0), 0),
        count: days.filter((iso) => b.logs[iso]?.checked).length,
      }))
      .filter((x) => x.min > 0 || x.count > 0);

    const habitMinTotal = habitStats.reduce((sum, h) => sum + h.min, 0);
    const blockMinTotal = blockStats.reduce((sum, b) => sum + b.min, 0);

    const priorityPending: Record<Priority, number> = { alta: 0, media: 0, baixa: 0 };
    s.tasks.forEach((t) => {
      if (!t.done) priorityPending[t.priority]++;
    });

    const workMin = (byCategory.trabalho || 0) + (byCategory.pessoal || 0);
    const studyMin = (byCategory.estudo || 0) + (byCategory.dev || 0);

    const statusBuckets: Record<string, Task[]> = {};
    s.taskStatuses.forEach((st) => {
      statusBuckets[st.id] = s.tasks.filter((t) => t.statusId === st.id);
    });

    return {
      overdueCount,
      overdueTasks,
      noDateCount,
      doneCount: doneInPeriod.length,
      pendingCount: pendingInPeriod.length,
      totalMin: taskMinTotal + habitMinTotal + blockMinTotal,
      workMin,
      studyMin,
      byCategory,
      habitStats,
      blockStats,
      priorityPending,
      statusBuckets,
      taskStatuses: [...s.taskStatuses].sort((a, b) => a.order - b.order),
    };
  }, [board.state, fromISO, toISO, today]);

  const catEntries = (Object.keys(stats.byCategory) as Category[])
    .map((c) => ({ cat: c, min: stats.byCategory[c] || 0 }))
    .sort((a, b) => b.min - a.min);
  const catTotal = catEntries.reduce((s, c) => s + c.min, 0);
  const pieGradient = (() => {
    if (!catTotal) return "var(--surface-2)";
    let acc = 0;
    const stops = catEntries.map(({ cat, min }) => {
      const start = (acc / catTotal) * 360;
      acc += min;
      const end = (acc / catTotal) * 360;
      return `${CAT_COLORS[cat]} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  const maxHabitMin = Math.max(1, ...stats.habitStats.map((h) => h.min));
  const maxBlockMin = Math.max(1, ...stats.blockStats.map((b) => b.min));
  const maxPriority = Math.max(1, ...Object.values(stats.priorityPending));
  const doneTotal = stats.doneCount + stats.pendingCount;

  function shiftPeriod(dir: 1 | -1) {
    if (period === "week") {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() + dir * 7);
      setWeekAnchor(d);
    } else {
      setMonthAnchor(monthAnchorOf(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + dir, 1)));
    }
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="período anterior" onClick={() => shiftPeriod(-1)}>
          ‹
        </button>
        <span className="dash-range-label mono">{rangeLabel(period, weekAnchor, monthAnchor)}</span>
        <button className="strip-nav" type="button" aria-label="próximo período" onClick={() => shiftPeriod(1)}>
          ›
        </button>
        <div className="view-toggle">
          <button
            type="button"
            className={"view-toggle-btn" + (period === "week" ? " active" : "")}
            onClick={() => setPeriod("week")}
          >
            Semana
          </button>
          <button
            type="button"
            className={"view-toggle-btn" + (period === "month" ? " active" : "")}
            onClick={() => setPeriod("month")}
          >
            Mês
          </button>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat-card danger">
          <div className="dash-stat-value">{stats.overdueCount}</div>
          <div className="dash-stat-label">Atrasadas</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{stats.noDateCount}</div>
          <div className="dash-stat-label">Sem data</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{stats.doneCount}</div>
          <div className="dash-stat-label">Concluídas no período</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{fmtHM(stats.totalMin)}</div>
          <div className="dash-stat-label">Tempo total</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{fmtHM(stats.workMin)}</div>
          <div className="dash-stat-label">Horas trabalhadas</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{fmtHM(stats.studyMin)}</div>
          <div className="dash-stat-label">Estudo e dev. pessoal</div>
        </div>
      </div>

      <div className="dash-charts">
        <div className="dash-box">
          <div className="dash-box-title">Tarefas</div>
          {stats.taskStatuses.map((st) => (
            <button
              type="button"
              key={st.id}
              className="dash-status-row"
              onClick={() => setModal({ title: st.label, tasks: stats.statusBuckets[st.id] || [] })}
            >
              <span className="dash-legend-dot" style={{ background: st.color }} />
              <span className="dash-legend-name">{st.label}</span>
              <span className="dash-legend-pct mono">{(stats.statusBuckets[st.id] || []).length}</span>
            </button>
          ))}
          <button
            type="button"
            className="dash-status-row"
            onClick={() => setModal({ title: "Atrasadas", tasks: stats.overdueTasks })}
          >
            <span className="dash-legend-dot" style={{ background: "var(--danger)" }} />
            <span className="dash-legend-name">Atrasadas</span>
            <span className="dash-legend-pct mono">{stats.overdueCount}</span>
          </button>
        </div>

        <div className="dash-box">
          <div className="dash-box-title">Hábitos</div>
          {!stats.habitStats.length && <div className="bar-empty">Nenhum hábito cadastrado.</div>}
          {stats.habitStats.map((h) => (
            <div className="bar-row" key={h.id}>
              <div className="bar-row-top">
                <span className="bar-row-name">{h.name}</span>
                <span className="bar-row-value">{fmtHM(h.min)}</span>
              </div>
              <div className="bar-row-track">
                <div className="bar-row-fill" style={{ width: `${(h.min / maxHabitMin) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="dash-box">
          <div className="dash-box-title">Blocos fixos</div>
          {!stats.blockStats.length && <div className="bar-empty">Nenhum bloco fixo cadastrado.</div>}
          {stats.blockStats.map((b) => (
            <div className="bar-row" key={b.id}>
              <div className="bar-row-top">
                <span className="bar-row-name">{b.name}</span>
                <span className="bar-row-value">{fmtHM(b.min)}</span>
              </div>
              <div className="bar-row-track">
                <div className="bar-row-fill" style={{ width: `${(b.min / maxBlockMin) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="dash-box">
          <div className="dash-box-title">Tempo por categoria</div>
          {!catEntries.length && <div className="bar-empty">Nenhuma tarefa concluída com duração no período.</div>}
          {!!catEntries.length && (
            <div className="dash-pie-row">
              <div className="dash-pie" style={{ background: pieGradient }} />
              <div className="dash-pie-legend">
                {catEntries.map(({ cat, min }) => (
                  <div className="dash-legend-row" key={cat}>
                    <span className="dash-legend-dot" style={{ background: CAT_COLORS[cat] }} />
                    <span className="dash-legend-name">{CATEGORY_LABEL[cat]}</span>
                    <span className="dash-legend-pct">{Math.round((min / catTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dash-box">
          <div className="dash-box-title">Prioridade (pendentes)</div>
          {(["alta", "media", "baixa"] as Priority[]).map((p) => (
            <div className="bar-row" key={p}>
              <div className="bar-row-top">
                <span className="bar-row-name">{p === "alta" ? "Alta" : p === "media" ? "Média" : "Baixa"}</span>
                <span className="bar-row-value">{stats.priorityPending[p]}</span>
              </div>
              <div className="bar-row-track">
                <div
                  className="bar-row-fill"
                  style={{
                    width: `${(stats.priorityPending[p] / maxPriority) * 100}%`,
                    background: p === "alta" ? "var(--flag-alta)" : p === "media" ? "var(--flag-media)" : "var(--flag-baixa)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="dash-box">
          <div className="dash-box-title">Concluídas x pendentes (período)</div>
          <div className="dash-split">
            {doneTotal > 0 && (
              <div className="dash-split-done" style={{ width: `${(stats.doneCount / doneTotal) * 100}%` }} />
            )}
          </div>
          <div className="dash-split-legend">
            <span>{stats.doneCount} concluídas</span>
            <span>{stats.pendingCount} pendentes</span>
          </div>
        </div>
      </div>

      {modal && <TaskListModal title={modal.title} tasks={modal.tasks} onClose={() => setModal(null)} />}
    </div>
  );
}
