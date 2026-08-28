"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { CommentButton } from "./CommentButton";
import { BellIcon, WarningIcon } from "./icons";
import { dateFromISO, todayISO } from "@/lib/date-utils";
import { isFeatureEnabled } from "@/lib/types";
import { MOODS } from "@/lib/mood";

const WATER_STEPS = [200, 500];

export function DailyLogPanel({ selectedDate }: { selectedDate: string }) {
  const { board } = useBoardCtx();
  const log = board.state.dailyLogs[selectedDate];
  const flags = board.state.settings.featureFlags;
  const waterOn = isFeatureEnabled(flags, "water");
  const dietOn = isFeatureEnabled(flags, "diet");
  const sleepOn = isFeatureEnabled(flags, "sleep");
  const moodOn = isFeatureEnabled(flags, "mood");
  const waterMl = log?.waterMl ?? 0;
  const dietPct = log?.dietPct ?? null;
  const dietNote = log?.dietNote ?? null;
  const dietMealsChecked = log?.dietMealsChecked ?? [];
  const dietMealNotes = log?.dietMealNotes ?? {};
  const selectedWeekDay = dateFromISO(selectedDate).getDay();
  const activeMeals = [...board.state.dietMeals]
    .filter((m) => m.active && (!m.weekDays || m.weekDays.length === 0 || m.weekDays.includes(selectedWeekDay)))
    .sort((a, b) => a.time.localeCompare(b.time));
  const sleptAt = log?.sleptAt ?? "";
  const wokeAt = log?.wokeAt ?? "";
  const mood = log?.mood ?? null;
  const moodNote = log?.moodNote ?? null;
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
    if (moodOn && mood === null) missing.push("humor do dia");
  }

  if (!waterOn && !dietOn && !sleepOn && !moodOn) return null;

  function setMood(v: number) {
    const next = mood === v ? null : v;
    board.updateDailyLog(selectedDate, next === null ? { mood: null, moodNote: null } : { mood: next });
  }

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
          <div className="dl-reminder">
            <BellIcon />
            <span>Ainda falta registrar hoje: {missing.join(", ")}.</span>
          </div>
        )}
        {waterOn && (
          <div className="dl-row">
            <div className="dl-row-top">
              <span className="dl-label">
                💧 Água
                <CommentButton
                  icon={<WarningIcon />}
                  value={board.state.settings.waterStrategies}
                  placeholder="Ex.: garrafa de 1L com marcador de borracha — a cada litro bebido, reposiciono o marcador."
                  ariaLabel="Estratégias pra manter o consumo de água"
                  onSave={(text) => board.updateSettings({ waterStrategies: text || null })}
                />
              </span>
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
              <CommentButton
                value={dietNote}
                placeholder="observação (opcional)"
                ariaLabel="Observação da dieta"
                onSave={(text) => board.updateDailyLog(selectedDate, { dietNote: text || null })}
              />
              {activeMeals.length > 0 && (
                <>
                  <span className="dl-diet-meals-count">
                    {dietMealsChecked.length}/{activeMeals.length}
                  </span>
                  {activeMeals.map((m) => {
                    const checked = dietMealsChecked.includes(m.id);
                    return (
                      <span key={m.id} className="dl-diet-meal-group">
                        <button
                          type="button"
                          className={"dl-diet-meal-chip" + (checked ? " checked" : "")}
                          onClick={() => board.toggleDietMealChecked(selectedDate, m.id)}
                        >
                          {checked ? "☑" : "☐"} {m.name}
                        </button>
                        <CommentButton
                          value={dietMealNotes[m.id] ?? null}
                          placeholder="peguei nisso, comi mais disso..."
                          ariaLabel={`Observação — ${m.name}`}
                          onSave={(text) => board.setDietMealNote(selectedDate, m.id, text)}
                        />
                      </span>
                    );
                  })}
                </>
              )}
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

        {moodOn && (
          <div className="dl-row">
            <div className="dl-row-top">
              <span className="dl-label">🙂 Humor {label}</span>
            </div>
            <div className="dl-mood-options">
              {MOODS.map((m) => (
                <div className="dl-mood-item" key={m.v}>
                  <button
                    type="button"
                    className={"dl-mood-btn" + (mood === m.v ? " active" : "")}
                    aria-label={m.label}
                    onClick={() => setMood(m.v)}
                  >
                    <span className="dl-mood-emoji">{m.emoji}</span>
                    <span className="dl-mood-name">{m.label}</span>
                  </button>
                  {mood === m.v && (
                    <CommentButton
                      value={moodNote}
                      placeholder="Quer comentar por que está se sentindo assim?"
                      ariaLabel="Comentário sobre o humor"
                      onSave={(text) => board.updateDailyLog(selectedDate, { moodNote: text || null })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
