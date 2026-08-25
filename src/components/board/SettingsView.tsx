"use client";

import { useState, type ReactNode } from "react";
import { useBoardCtx } from "./board-context";
import { ChevronIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
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

function CollapsibleBox({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="dash-box">
      <button type="button" className="dash-box-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="dash-box-title">{title}</span>
        <span className={"chevron" + (open ? " open" : "")}>
          <ChevronIcon />
        </span>
      </button>
      {open && <div className="dash-box-body">{children}</div>}
    </div>
  );
}

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [budgetInput, setBudgetInput] = useState<string | null>(null);
  const [waterGoalInput, setWaterGoalInput] = useState<string | null>(null);

  const tagColors = board.state.settings.tagColors;
  const featureFlags = board.state.settings.featureFlags;
  const waterEnabled = isFeatureEnabled(featureFlags, "water");

  function toggleFeature(key: string, checked: boolean) {
    board.updateSettings({ featureFlags: { ...featureFlags, [key]: checked } });
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Configurações</span>
        <span style={{ width: 30 }} />
      </div>

      <CollapsibleBox title="Tags da tarefa">
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
      </CollapsibleBox>

      <CollapsibleBox title="Painel de horas">
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
      </CollapsibleBox>

      <CollapsibleBox title="Painel do dia">
        <div className="settings-rows">
          {OPTIONAL_FEATURES.map((f) => (
            <div className="settings-toggle-row" key={f.key}>
              <span>
                <span className="settings-label">{f.label}</span>
                <span className="settings-toggle-hint">{f.hint}</span>
              </span>
              <ToggleSwitch
                checked={isFeatureEnabled(featureFlags, f.key)}
                onChange={(v) => toggleFeature(f.key, v)}
                ariaLabel={f.label}
              />
            </div>
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
      </CollapsibleBox>
    </div>
  );
}
