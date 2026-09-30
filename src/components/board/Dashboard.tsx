"use client";

import { useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";
import {
  DAY_NAMES,
  MONTH_NAMES_FULL,
  dateFromISO,
  fmtDayMonth,
  fmtHM,
  isoAddDays,
  isoFromDate,
  mondayOf,
  monthAnchorOf,
  todayISO,
  weekDatesFrom,
} from "@/lib/date-utils";
import { CATEGORY_LABEL, DEFAULT_TAG_COLORS, isFeatureEnabled, type Category, type Priority, type Task } from "@/lib/types";
import { moodByValue } from "@/lib/mood";
import { countOpenChecklistItems } from "@/lib/rich-text";
import { taskMinutesInRange } from "@/lib/board/task-time";
import { ChevronIcon } from "./icons";
import { TaskListModal } from "./TaskListModal";

type Period = "day" | "week" | "month";

// Paleta pra hábitos e blocos fixos na pizza. Eles não têm categoria, mas
// ocupam tempo real do dia (Lazer, Crossfit, Corrida) — sem eles o gráfico
// mostrava só metade da vida.
const EXTRA_COLORS = ["#4C8C7B", "#8A6FB0", "#C0803A", "#5B84B1", "#A45C6E", "#6B8E3D"];

function rangeForPeriod(period: Period, dayAnchor: string, weekAnchor: Date, monthAnchor: Date) {
  if (period === "day") return { fromISO: dayAnchor, toISO: dayAnchor };
  if (period === "week") {
    const dates = weekDatesFrom(weekAnchor);
    return { fromISO: isoFromDate(dates[0]), toISO: isoFromDate(dates[6]) };
  }
  const y = monthAnchor.getFullYear();
  const m = monthAnchor.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return { fromISO: isoFromDate(new Date(y, m, 1)), toISO: isoFromDate(new Date(y, m, lastDay)) };
}

function rangeLabel(period: Period, dayAnchor: string, weekAnchor: Date, monthAnchor: Date) {
  if (period === "day") {
    const d = dateFromISO(dayAnchor);
    return `${DAY_NAMES[d.getDay()]}, ${fmtDayMonth(dayAnchor)}`;
  }
  if (period === "month") return `${MONTH_NAMES_FULL[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;
  const dates = weekDatesFrom(weekAnchor);
  const a = dates[0];
  const b = dates[6];
  return `${a.getDate()}/${a.getMonth() + 1} – ${b.getDate()}/${b.getMonth() + 1}`;
}

/**
 * "24h 56min" vira 24<small>h</small> 56<small>min</small>.
 *
 * O número é o dado; a unidade é só a régua. Separando os dois no tamanho, o
 * olho pega a grandeza antes de ler — que é o serviço de um painel.
 */
function Tempo({ min }: { min: number }) {
  return (
    <>
      {fmtHM(min)
        .split(" ")
        .map((parte, i) => {
          const casa = /^(\d+)(\D*)$/.exec(parte);
          return (
            <span key={i}>
              {i > 0 ? " " : ""}
              {casa ? casa[1] : parte}
              {casa && casa[2] ? <small>{casa[2]}</small> : null}
            </span>
          );
        })}
    </>
  );
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
  const { board, openTaskInDay } = useBoardCtx();
  const [period, setPeriod] = useState<Period>("week");
  const [dayAnchor, setDayAnchor] = useState(() => todayISO());
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => monthAnchorOf(new Date()));

  const { fromISO, toISO } = rangeForPeriod(period, dayAnchor, weekAnchor, monthAnchor);
  const today = todayISO();

  const [modal, setModal] = useState<{ title: string; tasks: Task[] } | null>(null);

  const stats = useMemo(() => {
    const s = board.state;
    const overdueTasks = s.tasks.filter((t) => !t.done && t.date && t.date < today);
    const overdueCount = overdueTasks.length;
    const noDateTasks = s.tasks.filter((t) => !t.date);

    // Tópico em aberto = caixinha não marcada na observação da tarefa (pauta de
    // reunião ou lista de qualquer tarefa). Mais antigas primeiro — são as que
    // estão esperando há mais tempo; as sem data vão pro fim.
    const withTopics = s.tasks
      .map((t) => ({ task: t, open: countOpenChecklistItems(t.note) }))
      .filter((x) => x.open > 0)
      .sort((a, b) => (a.task.date ?? "9999-99-99").localeCompare(b.task.date ?? "9999-99-99"));
    const openTopicTasks = withTopics.map((x) => x.task);
    const openTopicTotal = withTopics.reduce((sum, x) => sum + x.open, 0);
    const doneInPeriod = s.tasks.filter((t) => t.done && t.date && t.date >= fromISO && t.date <= toISO);
    const pendingInPeriod = s.tasks.filter((t) => !t.done && t.date && t.date >= fromISO && t.date <= toISO);

    // Mesma regra do Painel de Horas (task-time.ts): o tempo entra no período em
    // que foi trabalhado, não no dia em que a tarefa está marcada. Antes, mover
    // uma tarefa de dia mudava de lugar todo o histórico dela.
    const taskTime = taskMinutesInRange(s, fromISO, toISO);
    const byCategory: Partial<Record<Category, number>> = taskTime.byCategory;
    const taskMinTotal = taskTime.total;

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

    const moodDays = days.map((iso) => ({ iso, mood: s.dailyLogs[iso]?.mood ?? null }));
    // "Doente" (v:0) é um estado físico, não um nível de humor — fica fora da média.
    const moodValues = moodDays.map((d) => d.mood).filter((v): v is number => v !== null && v !== 0);
    const moodAvg = moodValues.length ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : null;

    return {
      overdueCount,
      overdueTasks,
      openTopicTasks,
      openTopicTotal,
      noDateCount: noDateTasks.length,
      noDateTasks,
      doneCount: doneInPeriod.length,
      pendingCount: pendingInPeriod.length,
      totalMin: taskMinTotal + habitMinTotal + blockMinTotal,
      workMin,
      studyMin,
      byCategory,
      habitStats,
      blockStats,
      daysInPeriod: days.length,
      priorityPending,
      statusBuckets,
      taskStatuses: [...s.taskStatuses].sort((a, b) => a.order - b.order),
      moodDays,
      moodAvg,
    };
  }, [board.state, fromISO, toISO, today]);

  // A cor da fatia é a MESMA que o usuário configura nas tags, em Configurações
  // — antes a pizza tinha uma paleta própria, fixa no código, e não dava pra
  // trocar uma cor feia sem mexer no código.
  const tagColors = board.state.settings.tagColors;
  const corDaCategoria = (c: Category) => tagColors[c]?.hex ?? DEFAULT_TAG_COLORS[c].hex;

  const pieEntries = [
    ...(Object.keys(stats.byCategory) as Category[])
      .map((c) => ({ key: `cat-${c}`, label: CATEGORY_LABEL[c], min: stats.byCategory[c] || 0, color: corDaCategoria(c) }))
      .filter((e) => e.min > 0),
    // Hábitos e blocos entram como fatias próprias: Lazer é bloco fixo e
    // Corrida/Crossfit são hábitos, então nenhum deles tem categoria de tarefa.
    ...stats.habitStats
      .filter((h) => h.min > 0)
      .map((h, i) => ({ key: `hab-${h.id}`, label: h.name, min: h.min, color: EXTRA_COLORS[i % EXTRA_COLORS.length] })),
    ...stats.blockStats
      .filter((b) => b.min > 0)
      .map((b, i) => ({
        key: `blk-${b.id}`,
        label: b.name,
        min: b.min,
        color: EXTRA_COLORS[(i + 3) % EXTRA_COLORS.length],
      })),
  ].sort((a, b) => b.min - a.min);

  const catTotal = pieEntries.reduce((s, e) => s + e.min, 0);
  const pieGradient = (() => {
    if (!catTotal) return "var(--surface-2)";
    let acc = 0;
    const stops = pieEntries.map(({ color, min }) => {
      const start = (acc / catTotal) * 360;
      acc += min;
      const end = (acc / catTotal) * 360;
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  const maxHabitMin = Math.max(1, ...stats.habitStats.map((h) => h.min));
  const maxBlockMin = Math.max(1, ...stats.blockStats.map((b) => b.min));
  const maxPriority = Math.max(1, ...Object.values(stats.priorityPending));
  const doneTotal = stats.doneCount + stats.pendingCount;

  const moodOn = isFeatureEnabled(board.state.settings.featureFlags, "mood");

  function shiftPeriod(dir: 1 | -1) {
    if (period === "day") {
      setDayAnchor((iso) => isoAddDays(iso, dir));
    } else if (period === "week") {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() + dir * 7);
      setWeekAnchor(d);
    } else {
      setMonthAnchor(monthAnchorOf(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + dir, 1)));
    }
  }

  return (
    <div className="section">
      <div className="dsh-head">
        <span className="dsh-title">{rangeLabel(period, dayAnchor, weekAnchor, monthAnchor)}</span>
        <button className="dsh-nav-btn" type="button" aria-label="período anterior" onClick={() => shiftPeriod(-1)}>
          ‹
        </button>
        <button className="dsh-nav-btn" type="button" aria-label="próximo período" onClick={() => shiftPeriod(1)}>
          ›
        </button>
        <span className="dsh-head-space" />
        <div className="dsh-seg">
          <button type="button" className={"dsh-seg-btn" + (period === "day" ? " on" : "")} onClick={() => setPeriod("day")}>
            Dia
          </button>
          <button type="button" className={"dsh-seg-btn" + (period === "week" ? " on" : "")} onClick={() => setPeriod("week")}>
            Semana
          </button>
          <button type="button" className={"dsh-seg-btn" + (period === "month" ? " on" : "")} onClick={() => setPeriod("month")}>
            Mês
          </button>
        </div>
      </div>

      {/* Uma faixa só, dividida por linha de 1px — não sete cartões soltos.
          Os números são irmãos: separá-los em cartões fazia cada um pedir
          atenção por conta própria. */}
      <div className="dsh-kpis">
        <button
          type="button"
          className={"dsh-kpi" + (stats.overdueCount > 0 ? " alerta" : "")}
          title={stats.overdueCount > 0 ? "Ver as tarefas atrasadas" : undefined}
          disabled={stats.overdueCount === 0}
          onClick={() => setModal({ title: "Atrasadas", tasks: stats.overdueTasks })}
        >
          <span className="dsh-kpi-n">{stats.overdueCount}</span>
          <span className="dsh-kpi-l">Atrasadas</span>
        </button>
        <button
          type="button"
          className="dsh-kpi"
          title={
            stats.openTopicTotal > 0
              ? `${stats.openTopicTotal} tópico(s) em aberto em ${stats.openTopicTasks.length} tarefa(s) — clique pra ver a lista`
              : undefined
          }
          disabled={stats.openTopicTotal === 0}
          onClick={() => setModal({ title: "Tarefas com tópicos abertos", tasks: stats.openTopicTasks })}
        >
          <span className="dsh-kpi-n">{stats.openTopicTotal}</span>
          <span className="dsh-kpi-l">Tópicos abertos</span>
        </button>
        <button
          type="button"
          className="dsh-kpi"
          title={stats.noDateCount > 0 ? "Ver as tarefas sem data" : undefined}
          disabled={stats.noDateCount === 0}
          onClick={() => setModal({ title: "Sem data", tasks: stats.noDateTasks })}
        >
          <span className="dsh-kpi-n">{stats.noDateCount}</span>
          <span className="dsh-kpi-l">Sem data</span>
        </button>
        <div className="dsh-kpi">
          <span className="dsh-kpi-n">{stats.doneCount}</span>
          <span className="dsh-kpi-l">Concluídas no período</span>
        </div>
        <div className="dsh-kpi">
          <span className="dsh-kpi-n">
            <Tempo min={stats.totalMin} />
          </span>
          <span className="dsh-kpi-l">Tempo total</span>
        </div>
        <div className="dsh-kpi">
          <span className="dsh-kpi-n">
            <Tempo min={stats.workMin} />
          </span>
          <span className="dsh-kpi-l">Horas trabalhadas</span>
        </div>
        <div className="dsh-kpi">
          <span className="dsh-kpi-n">
            <Tempo min={stats.studyMin} />
          </span>
          <span className="dsh-kpi-l">Estudo e dev. pessoal</span>
        </div>
      </div>

      {/* Três colunas fixas, e assunto irmão dentro do MESMO cartão.
          O `column-count` de antes reordenava os blocos sozinho conforme a
          altura de cada um: o painel mudava de arrumação a cada semana, e
          nunca dava pra decorar onde as coisas ficam. */}
      <div className="dsh-grid">
        <div className="dsh-card">
          <div className="dsh-card-title">Tarefas</div>
          {stats.taskStatuses.map((st) => (
            <button
              type="button"
              key={st.id}
              className="dsh-row"
              onClick={() => setModal({ title: st.label, tasks: stats.statusBuckets[st.id] || [] })}
            >
              <span className="dsh-dot" style={{ background: st.color }} />
              <span className="dsh-row-name">{st.label}</span>
              <span className="dsh-row-n">{(stats.statusBuckets[st.id] || []).length}</span>
            </button>
          ))}
          <button
            type="button"
            className="dsh-row"
            onClick={() => setModal({ title: "Atrasadas", tasks: stats.overdueTasks })}
          >
            <span className="dsh-dot" style={{ background: "var(--danger)" }} />
            <span className="dsh-row-name">Atrasadas</span>
            <span className="dsh-row-n">{stats.overdueCount}</span>
          </button>

          <div className="dsh-sep" />

          <div className="dsh-sub">Concluídas × pendentes</div>
          <div className="dsh-bar">
            {doneTotal > 0 && <span style={{ width: `${(stats.doneCount / doneTotal) * 100}%` }} />}
          </div>
          <div className="dsh-hint">
            {stats.doneCount} concluídas · {stats.pendingCount} pendentes
          </div>

          <div className="dsh-sep" />

          <div className="dsh-sub">Prioridade das pendentes</div>
          {(["alta", "media", "baixa"] as Priority[]).map((p) => (
            <div className="dsh-prio" key={p}>
              <span className="dsh-prio-l">{p === "alta" ? "Alta" : p === "media" ? "Média" : "Baixa"}</span>
              <div className="dsh-bar">
                <span
                  style={{
                    width: `${(stats.priorityPending[p] / maxPriority) * 100}%`,
                    background:
                      p === "alta" ? "var(--flag-alta)" : p === "media" ? "var(--flag-media)" : "var(--flag-baixa)",
                  }}
                />
              </div>
              <span className="dsh-prio-n">{stats.priorityPending[p]}</span>
            </div>
          ))}
        </div>

        <div className="dsh-card">
          {moodOn && (
            <>
              <div className="dsh-card-title">Humor</div>
              {stats.moodAvg === null ? (
                <div className="dsh-empty">Nenhum humor registrado no período.</div>
              ) : (
                <>
                  <div className="dsh-mood">
                    <span className="dsh-mood-emoji">{moodByValue(Math.round(stats.moodAvg))?.emoji}</span>
                    <span className="dsh-mood-n">{stats.moodAvg.toFixed(1).replace(".", ",")}</span>
                    <span className="dsh-mood-l">
                      {moodByValue(Math.round(stats.moodAvg))?.label}
                      <em>média do período</em>
                    </span>
                  </div>
                  <div className="dsh-mood-days">
                    {stats.moodDays.map((d) => (
                      <span
                        key={d.iso}
                        className="dsh-mood-day"
                        title={`${d.iso}${d.mood !== null ? " — " + moodByValue(d.mood)?.label : ""}`}
                        style={d.mood !== null ? { background: moodByValue(d.mood)?.color } : undefined}
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="dsh-sep" />
            </>
          )}

          <div className="dsh-card-title">Onde foi o tempo</div>
          {!pieEntries.length && <div className="dsh-empty">Nada com tempo registrado no período.</div>}
          {!!pieEntries.length && (
            <div className="dsh-donut-wrap">
              <div className="dsh-donut" style={{ background: pieGradient }} />
              <div className="dsh-legend">
                {pieEntries.map(({ key, label, min, color }) => (
                  <div className="dsh-legend-row" key={key}>
                    <span className="dsh-dot" style={{ background: color }} />
                    <span className="dsh-legend-name">{label}</span>
                    <span className="dsh-legend-n">{Math.round((min / catTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dsh-card">
          <div className="dsh-card-title">
            Hábitos <span className="dsh-card-tag">tempo e dias ativos</span>
          </div>
          {!stats.habitStats.length && <div className="dsh-empty">Nenhum hábito cadastrado.</div>}
          {stats.habitStats.map((h) => (
            <div className="dsh-hab" key={h.id}>
              <div className="dsh-hab-top">
                <span className="dsh-hab-name">{h.name}</span>
                <span className="dsh-hab-v">
                  {fmtHM(h.min)}
                  <em>
                    {h.count}/{stats.daysInPeriod}d
                  </em>
                </span>
              </div>
              <div className="dsh-bar">
                <span style={{ width: `${(h.min / maxHabitMin) * 100}%` }} />
              </div>
            </div>
          ))}

          <div className="dsh-sep" />

          <div className="dsh-card-title">
            Dia a Dia <span className="dsh-card-tag">tempo e dias ativos</span>
          </div>
          {!stats.blockStats.length && <div className="dsh-empty">Nenhum bloco fixo cadastrado.</div>}
          {stats.blockStats.map((b) => (
            <div className="dsh-hab" key={b.id}>
              <div className="dsh-hab-top">
                <span className="dsh-hab-name">{b.name}</span>
                <span className="dsh-hab-v">
                  {fmtHM(b.min)}
                  <em>
                    {b.count}/{stats.daysInPeriod}d
                  </em>
                </span>
              </div>
              <div className="dsh-bar">
                <span style={{ width: `${(b.min / maxBlockMin) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {stats.noDateCount > 0 && (
        <button
          type="button"
          className="dsh-strip"
          onClick={() => setModal({ title: "Sem data", tasks: stats.noDateTasks })}
        >
          <span className="dsh-pill">
            Sem data <i>{stats.noDateCount}</i>
          </span>
          <span>
            {stats.noDateCount === 1 ? "1 tarefa esperando" : `${stats.noDateCount} tarefas esperando`} uma data
          </span>
          <span className="dsh-chev">
            <ChevronIcon />
          </span>
        </button>
      )}

      {modal && (
        <TaskListModal
          title={modal.title}
          tasks={modal.tasks}
          onSelect={openTaskInDay}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
