"use client";

import { useState, type ReactNode } from "react";
import { useBoardCtx } from "./board-context";
import { ChevronIcon, ClockIcon, FlagIcon, HomeIcon, TagIcon, TrashIcon, WaterDropIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { CATEGORY_LABEL, OPTIONAL_FEATURES, isFeatureEnabled, type Category, type TaskStatus } from "@/lib/types";
import type { UseBoard } from "@/lib/board/use-board";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

function CollapsibleBox({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="dash-box">
      <button type="button" className="dash-box-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="dash-box-title">
          {icon && <span className="dash-box-icon">{icon}</span>}
          {title}
        </span>
        <span className={"chevron" + (open ? " open" : "")}>
          <ChevronIcon />
        </span>
      </button>
      {open && <div className="dash-box-body">{children}</div>}
    </div>
  );
}

function StatusRow({
  status,
  board,
  canDelete,
  isFirst,
  isLast,
  onMove,
}: {
  status: TaskStatus;
  board: UseBoard;
  canDelete: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  return (
    <div className="status-row">
      <input
        type="color"
        value={status.color}
        onChange={(e) => board.updateTaskStatus(status.id, { color: e.target.value })}
      />
      <input
        type="text"
        className="status-row-label"
        value={labelDraft ?? status.label}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={() => {
          if (labelDraft === null) return;
          const trimmed = labelDraft.trim();
          if (trimmed && trimmed !== status.label) board.updateTaskStatus(status.id, { label: trimmed });
          setLabelDraft(null);
        }}
      />
      <label className="status-row-done">
        <ToggleSwitch
          checked={status.isDone}
          onChange={(v) => board.updateTaskStatus(status.id, { isDone: v })}
          ariaLabel="Conclui a tarefa"
        />
        <span>Conclui a tarefa</span>
      </label>
      <div className="status-row-move">
        <button type="button" className="icon-btn" disabled={isFirst} aria-label="Mover para cima" onClick={() => onMove(status.id, -1)}>
          <span style={{ display: "flex", transform: "rotate(180deg)" }}>
            <ChevronIcon />
          </span>
        </button>
        <button type="button" className="icon-btn" disabled={isLast} aria-label="Mover para baixo" onClick={() => onMove(status.id, 1)}>
          <ChevronIcon />
        </button>
      </div>
      <button
        type="button"
        className="icon-btn danger-hover"
        aria-label="Excluir status"
        disabled={!canDelete}
        title={canDelete ? "Excluir status" : "Precisa ter pelo menos um status"}
        onClick={() => board.deleteTaskStatus(status.id)}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [budgetInput, setBudgetInput] = useState<string | null>(null);
  const [waterGoalInput, setWaterGoalInput] = useState<string | null>(null);
  const [waterStrategiesInput, setWaterStrategiesInput] = useState<string | null>(null);
  const [newStatusLabel, setNewStatusLabel] = useState("");

  const tagColors = board.state.settings.tagColors;
  const featureFlags = board.state.settings.featureFlags;
  const waterEnabled = isFeatureEnabled(featureFlags, "water");

  function toggleFeature(key: string, checked: boolean) {
    board.updateSettings({ featureFlags: { ...featureFlags, [key]: checked } });
  }

  const statuses = [...board.state.taskStatuses].sort((a, b) => a.order - b.order);

  function moveStatus(id: string, dir: -1 | 1) {
    const idx = statuses.findIndex((s) => s.id === id);
    const swapWith = idx + dir;
    if (idx === -1 || swapWith < 0 || swapWith >= statuses.length) return;
    const ids = statuses.map((s) => s.id);
    [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
    board.reorderTaskStatuses(ids);
  }

  function addStatus() {
    const label = newStatusLabel.trim();
    if (!label) return;
    board.addTaskStatus(label, "#4A47D5");
    setNewStatusLabel("");
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

      <CollapsibleBox title="Tags da tarefa" icon={<TagIcon />}>
        <div className="settings-rows">
          {CATEGORIES.map((cat) => {
            const cfg = tagColors[cat];
            return (
              <div className="settings-row" key={cat}>
                <input
                  type="color"
                  value={cfg.hex}
                  onChange={(e) =>
                    board.updateSettings({
                      tagColors: { ...tagColors, [cat]: { hex: e.target.value, alpha: cfg.alpha } },
                    })
                  }
                />
                <span className="settings-label">{CATEGORY_LABEL[cat]}</span>
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
            );
          })}
        </div>
      </CollapsibleBox>

      <CollapsibleBox title="Status de tarefa" icon={<FlagIcon color="currentColor" />}>
        <div className="status-rows">
          {statuses.map((s, i) => (
            <StatusRow
              key={s.id}
              status={s}
              board={board}
              canDelete={statuses.length > 1}
              isFirst={i === 0}
              isLast={i === statuses.length - 1}
              onMove={moveStatus}
            />
          ))}
        </div>
        <div className="status-row-add">
          <input
            type="text"
            placeholder="Novo status (ex.: Bloqueada)"
            value={newStatusLabel}
            onChange={(e) => setNewStatusLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStatus()}
          />
          <button type="button" className="btn btn-ghost" onClick={addStatus}>
            Adicionar
          </button>
        </div>
      </CollapsibleBox>

      <CollapsibleBox title="Painel de horas" icon={<ClockIcon />}>
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

      <CollapsibleBox title="Painel do dia" icon={<HomeIcon />}>
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
        {waterEnabled && (
          <div className="settings-subblock">
            <span className="settings-label">
              <WaterDropIcon /> Ideias para manter o consumo de água
            </span>
            <span className="settings-toggle-hint">
              Guarde aqui as estratégias que funcionam pra você — pra poder revisitar sempre que perder a rota.
            </span>
            <textarea
              className="settings-subblock-textarea"
              placeholder="Ex.: garrafa de 1L com marcador de borracha — a cada litro bebido, reposiciono o marcador na garrafa."
              value={waterStrategiesInput ?? board.state.settings.waterStrategies ?? ""}
              onChange={(e) => setWaterStrategiesInput(e.target.value)}
              onBlur={() => {
                if (waterStrategiesInput === null) return;
                board.updateSettings({ waterStrategies: waterStrategiesInput || null });
                setWaterStrategiesInput(null);
              }}
              rows={3}
            />
          </div>
        )}
      </CollapsibleBox>
    </div>
  );
}
