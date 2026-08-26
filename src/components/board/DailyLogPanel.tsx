"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { todayISO } from "@/lib/date-utils";
import { isFeatureEnabled } from "@/lib/types";

const WATER_STEPS = [200, 500];

const MOODS = [
  { v: 1, emoji: "😞", label: "Péssimo" },
  { v: 2, emoji: "😕", label: "Ruim" },
  { v: 3, emoji: "😐", label: "Neutro" },
  { v: 4, emoji: "🙂", label: "Bom" },
  { v: 5, emoji: "😄", label: "Ótimo" },
];

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
  const dietNote = log?.dietNote ?? "";
  const sleptAt = log?.sleptAt ?? "";
  const wokeAt = log?.wokeAt ?? "";
  const mood = log?.mood ?? null;
  const moodNote = log?.moodNote ?? "";
  const goalMl = board.state.settings.waterGoalMl || 2000;
  const pct = goalMl > 0 ? Math.min(100, (waterMl / goalMl) * 100) : 0;
  const [dietInput, setDietInput] = useState<string | null>(null);
  const [dietNoteInput, setDietNoteInput] = useState<string | null>(null);
  const [moodNoteInput, setMoodNoteInput] = useState<string | null>(null);
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

  function commitMoodNote() {
    if (moodNoteInput === null) return;
    board.updateDailyLog(selectedDate, { moodNote: moodNoteInput.trim() || null });
    setMoodNoteInput(null);
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

  function commitDietNote() {
    if (dietNoteInput === null) return;
    board.updateDailyLog(selectedDate, { dietNote: dietNoteInput.trim() || null });
    setDietNoteInput(null);
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
              <input
                type="text"
                className="dl-note-input"
                placeholder="observação (opcional)"
                value={dietNoteInput ?? dietNote}
                onChange={(e) => setDietNoteInput(e.target.value)}
                onBlur={commitDietNote}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
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
                <button
                  key={m.v}
                  type="button"
                  className={"dl-mood-btn" + (mood === m.v ? " active" : "")}
                  aria-label={m.label}
                  onClick={() => setMood(m.v)}
                >
                  <span className="dl-mood-emoji">{m.emoji}</span>
                  <span className="dl-mood-name">{m.label}</span>
                </button>
              ))}
            </div>
            {mood !== null && (
              <input
                type="text"
                className="dl-note-input dl-mood-note"
                placeholder="Quer comentar por que está se sentindo assim? (opcional)"
                value={moodNoteInput ?? moodNote}
                onChange={(e) => setMoodNoteInput(e.target.value)}
                onBlur={commitMoodNote}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
