"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useBoardCtx } from "./board-context";
import { useWhatsAppCost } from "@/lib/board/use-whatsapp-cost";
import {
  ArchiveIcon,
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
// Backup dos dados. A rota que alimenta isto SÓ LÊ — não existe caminho nela
// que escreva, apague ou altere. É por isso que o botão pode ser apertado a
// qualquer hora, sem medo: um backup que consegue estragar o que está salvo não
// é backup.
function BackupBox() {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<{ linhas: number; tabelas: number; completo: boolean } | null>(null);

  async function baixar() {
    setBaixando(true);
    setErro(null);
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error(`O servidor respondeu ${res.status}`);
      const texto = await res.text();

      // Confere o manifesto ANTES de entregar o arquivo. Backup que se apresenta
      // como completo sem ser é pior que backup nenhum, porque desliga a
      // desconfiança de quem depende dele.
      const conteudo = JSON.parse(texto) as {
        manifesto?: { totalLinhas?: number; tabelas?: number; completo?: boolean; falhas?: Record<string, string> };
      };
      const m = conteudo.manifesto;
      if (!m || typeof m.totalLinhas !== "number") throw new Error("O arquivo veio sem manifesto");
      if (!m.completo) {
        const quais = Object.keys(m.falhas ?? {}).join(", ");
        throw new Error(`O backup saiu INCOMPLETO — falhou em: ${quais || "tabelas não identificadas"}`);
      }

      const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `faro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setUltimo({ linhas: m.totalLinhas, tabelas: m.tabelas ?? 0, completo: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar o backup");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <CollapsibleBox title="Backup" icon={<ArchiveIcon />}>
      <button type="button" className="btn btn-accent" onClick={baixar} disabled={baixando}>
        {baixando ? "Gerando..." : "Baixar backup agora"}
      </button>

      {ultimo && (
        <div className="hint-text" style={{ marginTop: 8 }}>
          Baixado: <strong>{ultimo.linhas} linhas</strong> em {ultimo.tabelas} tabelas. Confira que o número faz
          sentido — backup que encolheu de um dia pro outro é sinal de problema.
        </div>
      )}

      {erro && (
        <div className="wa-cost-warn">
          <WarningIcon /> {erro}
        </div>
      )}

      <div className="hint-text">
        Gera um arquivo com tudo que está no seu FARO. A geração <strong>só lê</strong> — não altera nada, então
        pode rodar a qualquer momento. Guarde o arquivo fora do computador (Drive, e-mail, o que preferir): backup
        que mora no mesmo lugar do original não protege de muita coisa.
        <br />
        <br />
        Anexos e fotos ficam no Storage do Supabase — o arquivo guarda a referência, não os arquivos em si.
      </div>
    </CollapsibleBox>
  );
}

function WhatsAppCostBox() {
  const { board } = useBoardCtx();
  const { whatsappMsgCostUsd, whatsappMonthlyCapBrl, whatsappUsdBrl } = board.state.settings;
  // As contagens saem prontas do efeito, não do render: ler o relógio durante a
  // renderização é impuro (e o React reclama, com razão — o mesmo render daria
  // resultados diferentes).
  // A conta saiu daqui pro useWhatsAppCost: o mesmo número agora aparece no
  // Dashboard, e duas cópias da mesma conta divergem com o tempo.
  const resumo = useWhatsAppCost();
  const [capInput, setCapInput] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState<string | null>(null);
  const [fxInput, setFxInput] = useState<string | null>(null);

  const noMes = resumo?.noMes ?? 0;
  const em4Dias = resumo?.em4Dias ?? 0;
  const falhas = resumo?.falhas ?? 0;
  const entregues = resumo?.entregues ?? 0;
  const naoEntregues = resumo?.naoEntregues ?? 0;
  const semConfirmacao = resumo?.semConfirmacao ?? 0;

  const custoMsgBrl = whatsappMsgCostUsd * whatsappUsdBrl;
  const custoMesBrl = noMes * custoMsgBrl;
  const projecaoMesBrl = (em4Dias / 4) * 30 * custoMsgBrl;
  const pctDoTeto = whatsappMonthlyCapBrl ? Math.min(100, (custoMesBrl / whatsappMonthlyCapBrl) * 100) : 0;
  const noTeto = whatsappMonthlyCapBrl !== null && custoMesBrl >= whatsappMonthlyCapBrl;

  function commitCap() {
    if (capInput === null) return;
    const limpo = capInput.trim();
    const valor = limpo === "" ? null : Number(limpo.replace(",", "."));
    if (limpo === "" || (Number.isFinite(valor) && (valor as number) >= 0)) {
      board.updateSettings({ whatsappMonthlyCapBrl: valor });
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

          {whatsappMonthlyCapBrl !== null && (
            <>
              <div className="wa-cap-bar">
                <div className={"wa-cap-fill" + (noTeto ? " over" : "")} style={{ width: `${pctDoTeto}%` }} />
              </div>
              <div className={"wa-cap-label" + (noTeto ? " over" : "")}>
                {noTeto
                  ? `Teto do mês atingido — nenhuma mensagem nova sai até o mês virar ou o teto subir.`
                  : `${fmtBRL(Math.round(custoMesBrl * 100))} de ${fmtBRL(
                      Math.round(whatsappMonthlyCapBrl * 100)
                    )} do teto · no ritmo dos últimos 4 dias, o mês fecha em ${fmtBRL(
                      Math.round(projecaoMesBrl * 100)
                    )}`}
              </div>
            </>
          )}

          {noMes > 0 && (
            <div className="wa-entrega">
              {/* "Enviada" sempre quis dizer só "a Meta aceitou". Agora a linha
                  separa o que CHEGOU do que a gente só torce pra ter chegado. */}
              <span className="wa-entrega-item ok">{entregues} entregue(s)</span>
              {semConfirmacao > 0 && (
                <span className="wa-entrega-item" title="A Meta aceitou, mas ainda não confirmou a entrega">
                  {semConfirmacao} sem confirmação
                </span>
              )}
              {naoEntregues > 0 && (
                <span className="wa-entrega-item ruim">{naoEntregues} não entregue(s)</span>
              )}
            </div>
          )}

          {falhas > 0 && (
            <div className="wa-cost-warn">
              <WarningIcon /> {falhas} envio(s) falharam nesse mês. Falha não é cobrada, mas quer dizer que o
              lembrete não chegou.
            </div>
          )}

          <div className="settings-row-standalone">
            <span className="settings-label">Teto de gasto no mês (R$)</span>
            <input
              type="text"
              inputMode="decimal"
              className="budget-input"
              placeholder="sem teto"
              value={capInput ?? (whatsappMonthlyCapBrl === null ? "" : String(whatsappMonthlyCapBrl))}
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
            <span className="settings-label">Dólar (converte a tarifa pra real)</span>
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
            nenhuma API da Meta. Hoje cada lembrete sai por {fmtBRL(Math.round(custoMsgBrl * 100))} — o teto
            de {whatsappMonthlyCapBrl === null ? "nenhum" : fmtBRL(Math.round(whatsappMonthlyCapBrl * 100))}{" "}
            dá pra {whatsappMonthlyCapBrl === null ? 0 : Math.floor(whatsappMonthlyCapBrl / custoMsgBrl)}{" "}
            mensagens no mês. Quando a primeira fatura chegar, ajusta a tarifa aqui pra bater com o valor real
            — e o teto passa a valer sobre esse número.
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
        <span style={{ width: 32 }} />
      </div>

      {/* Duas colunas: empilhado, cada cartão ocupava a largura toda e a tela
          virava uma fita vertical sem fim. */}
      <div className="settings-grade">

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
                {/* A barra se pinta sozinha com a cor da tag e com o quanto
                    está preenchida — o CSS não enxerga o valor de um range, só
                    o componente. Mesma geometria da barra do Dashboard. */}
                <input
                  type="range"
                  className="settings-range"
                  style={
                    {
                      "--tag-cor": cfg.hex,
                      "--pct": `${Math.round(cfg.alpha * 100)}%`,
                    } as React.CSSProperties
                  }
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

        <BackupBox />
      </div>
    </div>
  );
}
