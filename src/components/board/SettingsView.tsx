"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useBoardCtx } from "./board-context";
import {
  BellIcon,
  ChevronIcon,
  ClockIcon,
  FlagIcon,
  HomeIcon,
  TagIcon,
  TrashIcon,
  WarningIcon,
  WaterDropIcon,
  WhatsAppIcon,
} from "./icons";
import { createClient } from "@/lib/supabase/client";
import { fmtBRL } from "@/lib/money";
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function PushNotificationsBox() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time feature/support detection on mount
      setSupported(false);
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSupported(false));
  }, []);

  async function enable() {
    setBusy(true);
    setStatus(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Permissão de notificação negada pelo navegador.");
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setStatus("Chave pública VAPID não configurada no servidor.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Falha ao salvar inscrição");
      setSubscribed(true);
      setStatus("Notificações ativadas.");
    } catch (err) {
      console.error("push enable", err);
      setStatus("Não deu pra ativar agora. Tenta de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setStatus(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setStatus("Notificações desativadas.");
    } catch (err) {
      console.error("push disable", err);
      setStatus("Não deu pra desativar agora. Tenta de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Falha ao enviar o teste");
      setStatus("Teste enviado — confira a notificação no celular.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Não deu pra enviar o teste.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapsibleBox title="Notificações push" icon={<BellIcon />}>
      {!supported ? (
        <div className="hint-text">Esse navegador não suporta notificações push.</div>
      ) : (
        <>
          <div className="settings-toggle-row">
            <span>
              <span className="settings-label">Receber lembretes como notificação</span>
              <span className="settings-toggle-hint">
                Grátis, direto do navegador ou do app instalado — sem depender de WhatsApp.
              </span>
            </span>
            <ToggleSwitch
              checked={subscribed}
              onChange={(v) => (v ? enable() : disable())}
              ariaLabel="Notificações push"
            />
          </div>
          {subscribed && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={sendTest}>
              Testar notificação
            </button>
          )}
          {status && <div className="hint-text">{status}</div>}
        </>
      )}
    </CollapsibleBox>
  );
}

// Gasto do WhatsApp. O número confiável é o do FARO, não o da Meta: a rota de
// disparo grava uma linha por mensagem enviada, então dá pra saber o gasto sem
// depender de API externa nenhuma — e a trava de teto usa exatamente essa conta.
function WhatsAppCostBox() {
  const { board } = useBoardCtx();
  const { whatsappMsgCostUsd, whatsappMonthlyCapUsd, whatsappUsdBrl } = board.state.settings;
  // As contagens saem prontas do efeito, não do render: ler o relógio durante a
  // renderização é impuro (e o React reclama, com razão — o mesmo render daria
  // resultados diferentes).
  const [resumo, setResumo] = useState<{ noMes: number; em4Dias: number; falhas: number } | null>(null);
  const [capInput, setCapInput] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState<string | null>(null);
  const [fxInput, setFxInput] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
    const quatroDias = new Date(agora.getTime() - 4 * 24 * 3600 * 1000).toISOString();
    // 60 dias cobrem o mês corrente e o anterior — é tudo que o painel mostra.
    const desde = new Date(agora.getTime() - 60 * 24 * 3600 * 1000).toISOString();
    supabase
      .from("whatsapp_sends")
      .select("sent_at, ok")
      .gte("sent_at", desde)
      .order("sent_at", { ascending: false })
      .then(({ data }) => {
        const linhas = data ?? [];
        const enviadas = linhas.filter((l) => l.ok);
        setResumo({
          noMes: enviadas.filter((l) => l.sent_at >= inicioDoMes).length,
          em4Dias: enviadas.filter((l) => l.sent_at >= quatroDias).length,
          falhas: linhas.filter((l) => !l.ok && l.sent_at >= inicioDoMes).length,
        });
      });
  }, []);

  const noMes = resumo?.noMes ?? 0;
  const em4Dias = resumo?.em4Dias ?? 0;
  const falhas = resumo?.falhas ?? 0;

  const custoMesUsd = noMes * whatsappMsgCostUsd;
  const custoMesBrl = custoMesUsd * whatsappUsdBrl;
  const projecaoMesUsd = (em4Dias / 4) * 30 * whatsappMsgCostUsd;
  const pctDoTeto = whatsappMonthlyCapUsd ? Math.min(100, (custoMesUsd / whatsappMonthlyCapUsd) * 100) : 0;
  const noTeto = whatsappMonthlyCapUsd !== null && custoMesUsd >= whatsappMonthlyCapUsd;

  function commitCap() {
    if (capInput === null) return;
    const limpo = capInput.trim();
    const valor = limpo === "" ? null : Number(limpo.replace(",", "."));
    if (limpo === "" || (Number.isFinite(valor) && (valor as number) >= 0)) {
      board.updateSettings({ whatsappMonthlyCapUsd: valor });
    }
    setCapInput(null);
  }

  function commitNumero(
    draft: string | null,
    setDraft: (v: string | null) => void,
    aplicar: (v: number) => void
  ) {
    if (draft === null) return;
    const valor = Number(draft.trim().replace(",", "."));
    if (Number.isFinite(valor) && valor > 0) aplicar(valor);
    setDraft(null);
  }

  return (
    <CollapsibleBox title="Custo do WhatsApp" icon={<WhatsAppIcon />}>
      {resumo === null ? (
        <div className="hint-text">Carregando os envios...</div>
      ) : (
        <>
          <div className="wa-cost-grid">
            <div className="wa-cost-card">
              <div className="wa-cost-value">{noMes}</div>
              <div className="wa-cost-label">Mensagens no mês</div>
            </div>
            <div className="wa-cost-card">
              <div className="wa-cost-value">{fmtBRL(Math.round(custoMesBrl * 100))}</div>
              <div className="wa-cost-label">Gasto no mês</div>
            </div>
            <div className="wa-cost-card">
              <div className="wa-cost-value">{em4Dias}</div>
              <div className="wa-cost-label">Últimos 4 dias</div>
            </div>
          </div>

          {whatsappMonthlyCapUsd !== null && (
            <>
              <div className="wa-cap-bar">
                <div className={"wa-cap-fill" + (noTeto ? " over" : "")} style={{ width: `${pctDoTeto}%` }} />
              </div>
              <div className={"wa-cap-label" + (noTeto ? " over" : "")}>
                {noTeto
                  ? `Teto do mês atingido — nenhuma mensagem nova sai até o mês virar ou o teto subir.`
                  : `US$ ${custoMesUsd.toFixed(2)} de US$ ${whatsappMonthlyCapUsd.toFixed(2)} do teto · no ritmo dos últimos 4 dias, o mês fecha em US$ ${projecaoMesUsd.toFixed(2)}`}
              </div>
            </>
          )}

          {falhas > 0 && (
            <div className="wa-cost-warn">
              <WarningIcon /> {falhas} envio(s) falharam nesse mês. Falha não é cobrada, mas quer dizer que o
              lembrete não chegou.
            </div>
          )}

          <div className="settings-row-standalone">
            <span className="settings-label">Teto de gasto no mês (US$)</span>
            <input
              type="text"
              inputMode="decimal"
              className="budget-input"
              placeholder="sem teto"
              value={capInput ?? (whatsappMonthlyCapUsd === null ? "" : String(whatsappMonthlyCapUsd))}
              onChange={(e) => setCapInput(e.target.value)}
              onBlur={commitCap}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
          <div className="settings-row-standalone">
            <span className="settings-label">Tarifa por mensagem (US$)</span>
            <input
              type="text"
              inputMode="decimal"
              className="budget-input"
              value={rateInput ?? String(whatsappMsgCostUsd)}
              onChange={(e) => setRateInput(e.target.value)}
              onBlur={() =>
                commitNumero(rateInput, setRateInput, (v) => board.updateSettings({ whatsappMsgCostUsd: v }))
              }
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
          <div className="settings-row-standalone">
            <span className="settings-label">Dólar (só pra mostrar em reais)</span>
            <input
              type="text"
              inputMode="decimal"
              className="budget-input"
              value={fxInput ?? String(whatsappUsdBrl)}
              onChange={(e) => setFxInput(e.target.value)}
              onBlur={() => commitNumero(fxInput, setFxInput, (v) => board.updateSettings({ whatsappUsdBrl: v }))}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>

          <div className="hint-text">
            A conta é a do próprio FARO: cada mensagem enviada vira uma linha no registro, sem depender de
            nenhuma API da Meta. Quando a primeira fatura chegar, é só ajustar a tarifa aqui pra bater com o
            valor real — e o teto passa a valer sobre esse número.
          </div>
        </>
      )}
    </CollapsibleBox>
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
          {CATEGORIES.filter((cat) => cat !== "sem_categoria").map((cat) => {
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

      <PushNotificationsBox />

      <WhatsAppCostBox />
    </div>
  );
}
