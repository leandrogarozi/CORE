"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { todayISO } from "@/lib/date-utils";
import { isFeatureEnabled } from "@/lib/types";

const WATER_STEPS = [200, 500];

export function DailyLogPanel({ selectedDate }: { selectedDate: string }) {
  const { board } = useBoardCtx();
  const log = board.state.dailyLogs[selectedDate];
  const flags = board.state.settings.featureFlags;
  const waterOn = isFeatureEnabled(flags, "water");
  const dietOn = isFeatureEnabled(flags, "diet");
  const sleepOn = isFeatureEnabled(flags, "sleep");
  const waterMl = log?.waterMl ?? 0;
  const dietPct = log?.dietPct ?? null;
  const sleptAt = log?.sleptAt ?? "";
  const wokeAt = log?.wokeAt ?? "";
  const goalMl = board.state.settings.waterGoalMl || 2000;
  const pct = goalMl > 0 ? Math.min(100, (waterMl / goalMl) * 100) : 0;
  const [dietInput, setDietInput] = useState<string | null>(null);
  const isToday = selectedDate === todayISO();
  const label = isToday ? "hoje" : selectedDate;

  const missing: string[] = [];
  if (isToday) {
    if (sleepOn && !wokeAt) missing.push("horário que acordou");
    if (sleepOn && !sleptAt) missing.push("horário de dormir");
    if (dietOn && dietPct === null) missing.push("% da dieta");
  }

  if (!waterOn && !dietOn && !sleepOn) return null;

  function addWater(ml: number) {
    board.updateDailyLog(selectedDate, { waterMl: Math.max(0, waterMl + ml) });
  }

  function commitDiet() {
    if (dietInput === null) return;
    const v = dietInput === "" ? null : Math.max(0, Math.min(100, parseInt(dietInput, 10)));
    board.updateDailyLog(selectedDate, { dietPct: isNaN(v as number) ? null : v });
    setDietInput(null);
  }

  return (
    <div className="section daily-log-section">
      <div className="section-head">
        <span className="section-pill accent">Registro do dia</span>
      </div>
      <div className="daily-log-panel">
        {missing.length > 0 && (
          <div className="dl-reminder">🔔 Ainda falta registrar hoje: {missing.join(", ")}.</div>
        )}
        {waterOn && (
          <div className="dl-row">
            <div className="dl-row-top">
              <span className="dl-label">💧 Água</span>
              <span className="mono dl-value">
                {waterMl} <span className="dl-of">/ {goalMl} ml</span>
              </span>
            </div>
            <div className="hp-bar">
              <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="dl-water-actions">
              {WATER_STEPS.map((ml) => (
                <button key={ml} type="button" className="btn btn-ghost dl-water-btn" onClick={() => addWater(ml)}>
                  +{ml}ml
                </button>
              ))}
              {waterMl > 0 && (
                <button type="button" className="btn btn-ghost dl-water-btn" onClick={() => board.updateDailyLog(selectedDate, { waterMl: 0 })}>
                  Zerar
                </button>
              )}
            </div>
          </div>
        )}

        {dietOn && (
          <div className="dl-row">
            <div className="dl-row-top">
              <span className="dl-label">🍽️ Fidelidade à dieta {label}</span>
            </div>
            <div className="dl-diet-input">
              <input
                type="number"
                min={0}
                max={100}
                placeholder="—"
                className="dl-pct-input mono"
                value={dietInput ?? (dietPct ?? "")}
                onChange={(e) => setDietInput(e.target.value)}
                onBlur={commitDiet}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="dl-pct-sign">%</span>
            </div>
          </div>
        )}

        {sleepOn && (
          <div className="dl-row">
            <div className="dl-row-top">
              <span className="dl-label">😴 Sono</span>
            </div>
            <div className="dl-sleep-inputs">
              <label className="dl-sleep-field">
                <span>Acordou</span>
                <input
                  type="time"
                  value={wokeAt}
                  onChange={(e) => board.updateDailyLog(selectedDate, { wokeAt: e.target.value || null })}
                />
              </label>
              <label className="dl-sleep-field">
                <span>Dormiu</span>
                <input
                  type="time"
                  value={sleptAt}
                  onChange={(e) => board.updateDailyLog(selectedDate, { sleptAt: e.target.value || null })}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
