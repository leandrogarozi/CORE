"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useBoardCtx } from "./board-context";
import { useWhatsAppCost } from "@/lib/board/use-whatsapp-cost";
import {
  GRAUS_NA_TELA,
  INTENSIDADE_PADRAO,
  ROTULO_DA_INTENSIDADE,
  SEM_COR,
  TOM_PADRAO,
  TONS_DO_FUNDO,
  ehCorPersonalizada,
  type IntensidadeDoFundo,
} from "@/lib/board/fundo";
import {
  AREAS_DE_BACKUP,
  AREAS_PADRAO,
  arquivosDoBackup,
  ehAreaDeBackup,
  nomeDoZip,
  quantosArquivos,
  type AreaDeBackup,
  type DadosDoBackup,
} from "@/lib/learning-export";
import { temConteudo } from "@/lib/html-para-markdown";
import {
  ArchiveIcon,
  BellIcon,
  BookOpenIcon,
  ChevronIcon,
  ClockIcon,
  FlagIcon,
  HomeIcon,
  TagIcon,
  TrashIcon,
  WarningIcon,
  WaterDropIcon,
  WhatsAppIcon,
  PaletteIcon,
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
    <CollapsibleBox title="Backup completo do app (.json)" icon={<ArchiveIcon />}>
      {/* O formato entra no título e no botão porque foi exatamente o que o
          confundiu: ele clicou no bloco chamado "Backup" esperando o .zip dos
          textos e baixou um .json. Dois blocos começando com a mesma palavra,
          um ao lado do outro — a culpa é do nome, não dele. */}
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Este é o <strong>cofre</strong>: um arquivo técnico com tudo, pra
        restaurar o app se algo der errado. Não é pra ler. Os textos de
        aprendizado pra ler estão no outro bloco, <strong>Backup de
        aprendizado</strong>.
      </div>
      <button type="button" className="btn btn-accent" onClick={baixar} disabled={baixando}>
        {baixando ? "Gerando..." : "Baixar arquivo .json"}
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

/**
 * Backup de aprendizado: sinapses e resumos de livro viram arquivos de texto.
 *
 * Caixa separada do "Backup" de cima de propósito — são coisas diferentes e
 * confundir as duas é caro. O de cima é COFRE: JSON com tudo, serve pra
 * restaurar o app, ninguém lê. Este é BIBLIOTECA: texto legível, pra abrir no
 * celular e ler sem o FARO existir.
 *
 * O app NÃO escreve no Drive de ninguém. O arquivo é baixado e a pessoa guarda
 * onde quiser. É o que torna isto seguro de entregar pra terceiros: sem token de
 * Google de cliente no banco, sem verificação do Google, e sem risco de
 * atropelar a organização de pastas que a pessoa já tem.
 */
function BackupDeAprendizadoBox() {
  const { board } = useBoardCtx();
  const { backupAreas, backupName } = board.state.settings;
  const [nomeDraft, setNomeDraft] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<{ arquivos: number; nome: string } | null>(null);

  // null = nunca configurou. Trata como tudo marcado em vez de nada: um backup
  // que nasce sem nada selecionado parece quebrado no primeiro clique.
  const areas = (backupAreas ?? AREAS_PADRAO).filter(ehAreaDeBackup);
  const nome = nomeDraft ?? backupName ?? "";

  const dados: DadosDoBackup = {
    livros: board.state.books,
    sinapses: board.state.synapses,
  };

  // Quantos TÊM anotação, por área — o número que importa, porque é o que vai
  // sair. Mostrar "47 livros" prometeria 47 arquivos e sairiam 4.
  const comAnotacao = {
    sinapses: dados.sinapses.filter((x) => temConteudo(x.learning) || temConteudo(x.questions)).length,
    livros: dados.livros.filter((x) => temConteudo(x.insights)).length,
  };
  const totalNaArea = { sinapses: dados.sinapses.length, livros: dados.livros.length };
  // Menos o índice, que não é aprendizado — o número é a promessa do botão.
  const quantos = Math.max(0, quantosArquivos(dados, areas) - 1);

  function alternarArea(id: AreaDeBackup, ligado: boolean) {
    const nova = ligado ? [...areas, id] : areas.filter((a) => a !== id);
    board.updateSettings({ backupAreas: nova });
  }

  async function gerar() {
    setErro(null);
    setGerando(true);
    try {
      // Import dinâmico: a biblioteca do zip só é baixada por quem clica. Ela
      // não tem o que fazer nas outras telas e pesaria no carregamento de todas.
      const { default: JSZip } = await import("jszip");
      const agora = new Date().toISOString();
      const arquivos = arquivosDoBackup(dados, areas, nome, agora);
      const zip = new JSZip();
      for (const a of arquivos) zip.file(a.nome, a.conteudo);
      const blob = await zip.generateAsync({ type: "blob" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeDoZip(nome, agora);
      // No documento antes de clicar: link solto não dispara download em todo
      // navegador.
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoga DEPOIS. O clique é assíncrono: revogar na mesma linha corre o
      // risco de tirar o blob debaixo do download que acabou de começar — e sem
      // revogar nunca, o zip fica na memória da aba até recarregar a página.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setUltimo({ arquivos: arquivos.length, nome: link.download });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar o backup");
    } finally {
      setGerando(false);
    }
  }

  return (
    <CollapsibleBox title="Backup de aprendizado (.zip de textos)" icon={<BookOpenIcon />}>
      <div className="settings-row-standalone">
        <span className="settings-label">Nome do backup</span>
        <input
          type="text"
          className="budget-input"
          placeholder="Meu aprendizado"
          value={nome}
          onChange={(e) => setNomeDraft(e.target.value)}
          onBlur={() => {
            if (nomeDraft === null) return;
            board.updateSettings({ backupName: nomeDraft.trim() || null });
            setNomeDraft(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>

      <span className="edit-field-label" style={{ marginTop: 12 }}>
        O que entra
      </span>
      <div className="settings-rows">
        {AREAS_DE_BACKUP.map((a) => (
          <div className="settings-toggle-row" key={a.id}>
            <span>
              <span className="settings-label">{a.rotulo}</span>
              <span className="settings-toggle-hint">
                {comAnotacao[a.id]} com anotação
                {totalNaArea[a.id] > comAnotacao[a.id] && ` (de ${totalNaArea[a.id]})`}
              </span>
            </span>
            <ToggleSwitch
              checked={areas.includes(a.id)}
              onChange={(v) => alternarArea(a.id, v)}
              ariaLabel={a.rotulo}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-accent"
        style={{ marginTop: 12 }}
        onClick={gerar}
        disabled={gerando || quantos === 0}
      >
        {gerando
          ? "Gerando..."
          : quantos === 0
            ? "Nada com anotação pra gerar"
            : `Baixar .zip com ${quantos} ${quantos === 1 ? "texto" : "textos"}`}
      </button>

      {ultimo && (
        <div className="hint-text" style={{ marginTop: 8 }}>
          Baixado: <strong>{ultimo.nome}</strong>, com {ultimo.arquivos} arquivos (contando o índice).
        </div>
      )}

      {erro && (
        <div className="wa-cost-warn">
          <WarningIcon /> {erro}
        </div>
      )}

      <div className="hint-text">
        Um arquivo de texto por item, mais um índice, dentro de um <code>.zip</code>. Abre em qualquer lugar e
        importa formatado no Google Docs ou no Word.
        <br />
        <br />
        <strong>Só sai o que tem anotação.</strong> Livro que ainda é só título na estante não vira arquivo — ele
        aparece no índice, na lista de leitura.
        <br />
        <br />
        O arquivo é baixado pra você guardar onde quiser (Drive, HD, e-mail). O FARO não escreve em nuvem nenhuma,
        então nada aqui mexe na organização de pastas que você já tem.
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

          {/* O histórico por mês. Quando o mês vira, o contador zera — e sem
              isto o que foi gasto some da tela como se nunca tivesse existido.
              Ele pediu a leitura em frase: "esse mês X, mês passado Y".
              É REGISTRO, não análise de despesa: o FARO anota o valor e para
              aí, que é a regra que ele deu pro app. */}
          {resumo.meses.length > 0 && (
            <div className="wa-historico">
              <div className="prop-label">Mês a mês</div>
              {/* A linha carrega tudo: nome do mês, quantas e quanto. A frase
                  solta que existia aqui ("esse mês X, mês passado Y") repetia o
                  que a lista já dizia, e repetição em painel é só mais coisa
                  pra ler. */}
              <div className="wa-historico-lista">
                {resumo.meses.map((m) => (
                  <div className={"wa-historico-row" + (m.ehAtual ? " atual" : "")} key={m.chave}>
                    <span className="wa-historico-mes">{m.rotulo}</span>
                    <span className="wa-historico-dados">
                      {m.enviadas} {m.enviadas === 1 ? "mensagem" : "mensagens"} ·{" "}
                      <span className="mono">{fmtBRL(Math.round(m.enviadas * custoMsgBrl * 100))}</span>
                      {/* O mês corrente ainda não fechou, e o número dele vai
                          subir até o dia 1º. Sem isso a linha parece um total. */}
                      {m.ehAtual && " · até o momento"}
                    </span>
                    {/* Falha não custa, mas precisa aparecer: mês barato porque
                        nada saiu não é a mesma coisa que mês barato de verdade. */}
                    {m.falhas > 0 && <span className="wa-historico-falha">{m.falhas} falha(s)</span>}
                  </div>
                ))}
              </div>
              <div className="hint-text">
                O valor usa a tarifa e o câmbio de hoje, aplicados a todos os meses — o FARO registra quantas
                mensagens saíram, não o que a Meta cobrou em cada fatura.
              </div>
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

/**
 * Escolha do fundo: tom e intensidade, valendo nos dois temas.
 *
 * Nasceu de um vai e volta: eu acertava o tom no olho, mandava print, ele dizia
 * "está rosa", eu tentava de novo. Com o controle aqui, ele compara na tela de
 * verdade em segundos — e a pergunta "qual roxo" deixa de custar um deploy.
 *
 * Tons escolhidos em vez de seletor livre: um seletor aberto deixa escolher um
 * verde-limão forte, e aí o fundo briga com o roxo dos botões e das barras.
 */
function CorDoFundoBox() {
  const { board } = useBoardCtx();
  const { bgTone, bgIntensity } = board.state.settings;
  const salva = (bgIntensity ?? INTENSIDADE_PADRAO) as IntensidadeDoFundo;
  // Grau 0 era escolhível na versão anterior e significava a mesma coisa que
  // "Sem cor". Quem parou nele vê "Sem cor" marcado, não um tom marcado com
  // fundo liso e nenhum grau aceso — estado que não se explica na tela.
  const tomAtual = salva === 0 ? SEM_COR : bgTone ?? TOM_PADRAO;
  const intensidadeAtual = salva === 0 ? INTENSIDADE_PADRAO : salva;
  const personalizada = ehCorPersonalizada(tomAtual);

  // Escolher cor estando no 0 tem que pintar algo: sem isto o clique no tom
  // não muda nada na tela e parece quebrado.
  function escolherTom(id: string) {
    board.updateSettings(
      salva === 0 && id !== SEM_COR
        ? { bgTone: id, bgIntensity: INTENSIDADE_PADRAO }
        : { bgTone: id }
    );
  }

  return (
    <CollapsibleBox title="Cor do fundo" icon={<PaletteIcon />}>
      <span className="edit-field-label">Tom</span>
      <div className="note-options-chips fundo-tons">
        {TONS_DO_FUNDO.map((t) => (
          <button
            key={t.id}
            type="button"
            className={"note-chip" + (tomAtual === t.id ? " active" : "")}
            onClick={() => escolherTom(t.id)}
          >
            {/* A bolinha mostra o tom antes de clicar: nome de cor é discutível
                ("índigo" é azul ou roxo?), amostra não é. No "Sem cor" ela fica
                vazada, porque não há cor pra mostrar. */}
            <span
              className={"fundo-amostra" + (t.id === SEM_COR ? " vazia" : "")}
              style={t.id === SEM_COR ? undefined : { background: `rgb(${t.base[0]},${t.base[1]},${t.base[2]})` }}
            />
            {t.rotulo}
          </button>
        ))}

        {/* Cor livre, pro caso de nenhum dos tons servir. É um `label` com
            input de cor dentro: o seletor do sistema abre no clique, com a
            roda de cores que ele descreveu, e a escolha já vale ao mexer. */}
        <label className={"note-chip" + (personalizada ? " active" : "")}>
          <span
            className="fundo-amostra"
            style={{ background: personalizada ? tomAtual : "linear-gradient(135deg,#f66,#6cf,#6f9)" }}
          />
          Personalizada
          <input
            type="color"
            className="fundo-seletor"
            value={personalizada ? tomAtual : "#4A47D5"}
            onChange={(e) => escolherTom(e.target.value)}
          />
        </label>
      </div>

      <span className="edit-field-label" style={{ marginTop: 12 }}>
        Intensidade
      </span>
      <div className="view-toggle fundo-intensidade">
        {GRAUS_NA_TELA.map((n) => (
          <button
            key={n}
            type="button"
            className={"view-toggle-btn" + (intensidadeAtual === n ? " active" : "")}
            // Com "Sem cor" não há o que graduar — o controle fica visível, pra
            // ele ver que existe, e inerte até escolher uma cor.
            disabled={tomAtual === SEM_COR}
            onClick={() => board.updateSettings({ bgIntensity: n })}
          >
            {ROTULO_DA_INTENSIDADE[n]}
          </button>
        ))}
      </div>

      <div className="hint-text">
        A mesma escolha vale pro tema claro e pro escuro, com força diferente em
        cada um: no escuro o degradê tinge em vez de clarear, e acima de um certo
        ponto ele vira névoa cinza e come o contraste do texto.{" "}
        <strong>Neutro</strong> é sem degradê nenhum.
      </div>
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

        <CorDoFundoBox />

        <PushNotificationsBox />

        <WhatsAppCostBox />

        {/* Os dois backups ficam vizinhos, e nessa ordem: o de aprendizado é o
            que ele vai usar, o cofre JSON é o que ele raramente toca. */}
        <BackupDeAprendizadoBox />

        <BackupBox />
      </div>
    </div>
  );
}
