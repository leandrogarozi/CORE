"use client";

import { useBoardCtx } from "./board-context";
import { todayISO } from "@/lib/date-utils";

const RAIO = 52;
const VOLTA = 2 * Math.PI * RAIO;

/**
 * "Seu dia": quantas tarefas do dia já foram concluídas, em anel. As atrasadas contam
 * de todos os dias (mesma regra do Dashboard e da saudação).
 */
export function DaySummary({ selectedDate }: { selectedDate: string }) {
  const { board } = useBoardCtx();
  const doDia = board.state.tasks.filter((t) => t.date === selectedDate && !t.deletedAt);
  const concluidas = doDia.filter((t) => t.done).length;
  const pendentes = doDia.length - concluidas;
  const atrasadas = board.state.tasks.filter((t) => !t.done && !t.deletedAt && t.date && t.date < todayISO()).length;
  const pct = doDia.length > 0 ? concluidas / doDia.length : 0;

  return (
    <div className="section day-summary-section">
      <div className="section-head">
        <span className="section-pill accent">Seu dia</span>
      </div>
      <div className="day-summary">
        <div className="day-ring">
          <svg viewBox="0 0 128 128" width="112" height="112" role="img" aria-label={`${concluidas} de ${doDia.length} tarefas concluídas`}>
            <circle cx="64" cy="64" r={RAIO} fill="none" stroke="var(--accent-soft)" strokeWidth="14" />
            {pct > 0 && (
              <circle
                cx="64"
                cy="64"
                r={RAIO}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${VOLTA * pct} ${VOLTA}`}
                transform="rotate(-90 64 64)"
              />
            )}
          </svg>
          <div className="day-ring-center">
            <span className="day-ring-num mono">
              {concluidas}/{doDia.length}
            </span>
            <span className="day-ring-label">concluídas</span>
          </div>
        </div>
        <div className="day-summary-legend">
          <span>
            <i style={{ background: "var(--accent)" }} />
            Concluídas {concluidas}
          </span>
          <span>
            <i style={{ background: "var(--accent-soft)", boxShadow: "inset 0 0 0 1px var(--border-strong)" }} />
            Pendentes {pendentes}
          </span>
          <span>
            <i style={{ background: "var(--text-muted)" }} />
            Atrasadas {atrasadas}
          </span>
        </div>
      </div>
    </div>
  );
}
