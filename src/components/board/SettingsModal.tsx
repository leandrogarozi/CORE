"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { CATEGORY_LABEL, OPTIONAL_FEATURES, isFeatureEnabled, type Category } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.substring(0, 2), 16) || 153;
  const g = parseInt(full.substring(2, 4), 16) || 153;
  const b = parseInt(full.substring(4, 6), 16) || 153;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SettingsModal() {
  const { board, settingsOpen, setSettingsOpen } = useBoardCtx();
  const [budgetInput, setBudgetInput] = useState<string | null>(null);
  const [waterGoalInput, setWaterGoalInput] = useState<string | null>(null);
  if (!settingsOpen) return null;

  const tagColors = board.state.settings.tagColors;
  const featureFlags = board.state.settings.featureFlags;
  const waterEnabled = isFeatureEnabled(featureFlags, "water");

  function toggleFeature(key: string, checked: boolean) {
    board.updateSettings({ featureFlags: { ...featureFlags, [key]: checked } });
  }

  return (
    <>
      <div className="modal-backdrop" onClick={() => setSettingsOpen(false)} />
      <div className="modal-panel">
        <div className="modal-head">
          <div className="modal-title">Configurações</div>
          <button className="icon-btn" type="button" aria-label="Fechar" onClick={() => setSettingsOpen(false)}>
            ×
          </button>
        </div>

        <div className="settings-panel">
          <div className="settings-panel-title">Tags da tarefa</div>
          <div className="settings-rows">
            {CATEGORIES.map((cat) => {
              const cfg = tagColors[cat];
              return (
                <div className="settings-row" key={cat}>
                  <div className="settings-row-top">
                    <span className="settings-label">{CATEGORY_LABEL[cat]}</span>
                    <span className="chip" style={{ background: hexToRgba(cfg.hex, cfg.alpha), color: cfg.hex }}>
                      {CATEGORY_LABEL[cat]}
                    </span>
                  </div>
                  <div className="settings-row-controls">
                    <input
                      type="color"
                      value={cfg.hex}
                      onChange={(e) =>
                        board.updateSettings({
                          tagColors: { ...tagColors, [cat]: { hex: e.target.value, alpha: cfg.alpha } },
                        })
                      }
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(cfg.alpha * 100)}
                      onChange={(e) =>
                        board.updateSettings({
                          tagColors: { ...tagColors, [cat]: { hex: cfg.hex, alpha: Number(e.target.value) / 100 } },
                        })
                      }
                    />
                    <span className="settings-pct mono">{Math.round(cfg.alpha * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="settings-panel">
          <div className="settings-panel-title">Painel de horas</div>
          <div className="settings-row-standalone">
            <span className="settings-label">Teto diário de horas</span>
            <input
              type="number"
              min={0}
              step={0.5}
              className="budget-input"
              value={budgetInput ?? board.state.settings.dailyBudgetHours}
              onChange={(e) => setBudgetInput(e.target.value)}
              onBlur={() => {
                if (budgetInput === null) return;
                const v = parseFloat(budgetInput);
                if (!isNaN(v) && v >= 0) board.updateSettings({ dailyBudgetHours: v });
                setBudgetInput(null);
              }}
            />
          </div>
        </div>

        <div className="settings-panel">
          <div className="settings-panel-title">Painel do dia</div>
          <div className="settings-rows">
            {OPTIONAL_FEATURES.map((f) => (
              <label className="settings-toggle-row" key={f.key}>
                <input
                  type="checkbox"
                  checked={isFeatureEnabled(featureFlags, f.key)}
                  onChange={(e) => toggleFeature(f.key, e.target.checked)}
                />
                <span>
                  <span className="settings-label">{f.label}</span>
                  <span className="settings-toggle-hint">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {waterEnabled && (
            <div className="settings-row-standalone">
              <span className="settings-label">Meta diária de água (ml)</span>
              <input
                type="number"
                min={0}
                step={100}
                className="budget-input"
                value={waterGoalInput ?? board.state.settings.waterGoalMl}
                onChange={(e) => setWaterGoalInput(e.target.value)}
                onBlur={() => {
                  if (waterGoalInput === null) return;
                  const v = parseInt(waterGoalInput, 10);
                  if (!isNaN(v) && v >= 0) board.updateSettings({ waterGoalMl: v });
                  setWaterGoalInput(null);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
