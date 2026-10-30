"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useBoardCtx } from "./board-context";
import { createClient } from "@/lib/supabase/client";
import { conhecimentoParaExportar } from "@/lib/conhecimento";
import { useWhatsAppCost } from "@/lib/board/use-whatsapp-cost";
import { useIaCost } from "@/lib/board/use-ia-cost";
import {
  GRAUS_NA_TELA,
  INTENSIDADE_PADRAO,
  ROTULO_DA_INTENSIDADE,
  SEM_COR,
  TOM_PADRAO,
  TONS_DO_FUNDO,
  degradeDoFundo,
  ehCorPersonalizada,
  tomPorId,
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
  CalendarCheckIcon,
  CommentIcon,
  BellIcon,
  BoltIcon,
  BookOpenIcon,
  ChecklistIcon,
  ChevronIcon,
  ClockIcon,
  FlagIcon,
  HomeIcon,
  LinkIcon,
  MealIcon,
  MoodFaceIcon,
  MoonIcon,
  TagIcon,
  TrashIcon,
  WarningIcon,
  WaterDropIcon,
  WhatsAppIcon,
  PaletteIcon,
  WeekIcon,
} from "./icons";
import { fmtBRL } from "@/lib/money";
import { CREDITO_INICIAL, PACOTES_DE_CREDITO, saldoDe } from "@/lib/whatsapp/credito";
import { TETO_MAXIMO_DE_TESTADOR_BRL } from "@/lib/ia/custo";
import { RecurringManager } from "./RecurringManager";
import { emocoesEmUso, passosDeAgua, valorDaEmocao, type Emocao } from "@/lib/board/opcoes-do-dia";
import { ToggleSwitch } from "./ToggleSwitch";
import { CATEGORY_LABEL, isFeatureEnabled, type Category, type TaskStatus } from "@/lib/types";
import type { UseBoard } from "@/lib/board/use-board";
import { GRUPOS_DO_MENU, menuLigado } from "./Sidebar";
import { TutorialLink } from "./TutorialLink";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

/**
 * Bloco de configuração: ícone, nome, um resumo do que está valendo e a seta para abrir.
 * Fecha por padrão (o resumo já diz o essencial) e lembra, neste aparelho, quais ficaram abertos.
 * Os blocos dos painéis da tela principal levam também o interruptor "Mostrar na tela / Não usar".
 */
function CollapsibleBox({
  title,
  icon,
  children,
  resumo,
  ligado,
  onLigar,
  abertoInicial = false,
  textoLiga,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  resumo?: string;
  ligado?: boolean;
  onLigar?: (ligado: boolean) => void;
  abertoInicial?: boolean;
  /** Os dois textos ao lado da chave (ligada, desligada). Padrão: "Mostrar na tela" / "Não usar". */
  textoLiga?: [string, string];
}) {
  const chave = "faro-cfg-aberto:" + title;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return abertoInicial;
    try {
      const v = window.localStorage.getItem(chave);
      return v === null ? abertoInicial : v === "1";
    } catch {
      return abertoInicial;
    }
  });
  function alternar() {
    setOpen((v) => {
      try {
        window.localStorage.setItem(chave, v ? "0" : "1");
      } catch {
        // Sem armazenamento: só não lembra.
      }
      return !v;
    });
  }
  const desligado = onLigar !== undefined && !ligado;
  return (
    <div className={"cfg-bloco" + (open ? " aberto" : "") + (desligado ? " desligado" : "")}>
      <div className="cfg-bloco-cab">
        <button type="button" className="cfg-bloco-abrir" aria-expanded={open} onClick={alternar}>
          {icon && <span className="cfg-bloco-icone">{icon}</span>}
          <span className="cfg-bloco-nome">
            <b>{title}</b>
            {resumo && <span className="cfg-bloco-resumo">{resumo}</span>}
          </span>
        </button>
        {onLigar && (
          <span className="cfg-bloco-liga">
            <span>{ligado ? (textoLiga?.[0] ?? "Mostrar na tela") : (textoLiga?.[1] ?? "Não usar")}</span>
            <ToggleSwitch checked={!!ligado} onChange={onLigar} ariaLabel={`${title}: mostrar na tela principal`} />
          </span>
        )}
        <button type="button" className="cfg-bloco-seta" aria-label={open ? "Recolher" : "Abrir"} aria-expanded={open} onClick={alternar}>
          <span className={"chevron" + (open ? " open" : "")}>
            <ChevronIcon />
          </span>
        </button>
      </div>
      {open && <div className="cfg-bloco-corpo">{children}</div>}
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

function FeedbackBox() {
  const [tipo, setTipo] = useState<"problema" | "ideia" | "duvida" | "elogio">("problema");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar() {
    if (texto.trim().length < 3) return;
    setEnviando(true);
    setAviso(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, texto, pagina: typeof location !== "undefined" ? location.pathname : null }),
      });
      if (res.status === 429) throw new Error("Você já mandou várias mensagens hoje. Tente amanhã.");
      if (!res.ok) throw new Error("Não consegui enviar agora. Tente de novo em instantes.");
      setTexto("");
      setAviso({ ok: true, texto: "Enviado. Obrigado! Isso chega direto para quem está construindo o FARO." });
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : "Não consegui enviar." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CollapsibleBox title="Mandar feedback" icon={<CommentIcon />} resumo="Problema, ideia, dúvida ou elogio" abertoInicial>
      <div className="hint-text" style={{ marginTop: 0 }}>Achou um problema, tem uma ideia ou uma dúvida? Escreva aqui.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
        {(
          [
            ["problema", "Problema"],
            ["ideia", "Ideia"],
            ["duvida", "Dúvida"],
            ["elogio", "Elogio"],
          ] as const
        ).map(([v, l]) => (
          <button key={v} type="button" className={"dl-mood-emotion-chip" + (tipo === v ? " active" : "")} onClick={() => setTipo(v)}>
            {l}
          </button>
        ))}
      </div>
      <textarea
        className="budget-input"
        style={{ width: "100%", boxSizing: "border-box", minHeight: 84 }}
        placeholder="Conte o que aconteceu ou o que você gostaria. Se for um problema, diga em que tela estava."
        value={texto}
        maxLength={4000}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-accent" disabled={enviando || texto.trim().length < 3} onClick={enviar}>
          {enviando ? "Enviando…" : "Enviar"}
        </button>
        {aviso && <span className={aviso.ok ? "hint-text" : "auth-error"}>{aviso.texto}</span>}
      </div>
    </CollapsibleBox>
  );
}

function PushNotificationsBox() {
  const [supported, setSupported] = useState(true);
  // iPhone/iPad com o FARO aberto numa aba do navegador. Lá o iOS simplesmente
  // não expõe o push (Safari ou Chrome, tanto faz: os dois usam o motor da
  // Apple) — só existe dentro do app instalado na tela inicial. Dizer "esse
  // navegador não suporta" aqui é verdade e inútil: o que ele precisa saber é
  // o que fazer.
  const [precisaInstalar, setPrecisaInstalar] = useState(false);
  const [plataforma, setPlataforma] = useState<"ios" | "android" | "outro">("outro");
  const [instalado, setInstalado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    const ehIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const ehAndroid = /Android/i.test(ua);
    const rodandoInstalado =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time feature/support detection on mount
    setPlataforma(ehIos ? "ios" : ehAndroid ? "android" : "outro");
    setInstalado(rodandoInstalado);
    if (typeof Notification !== "undefined") setBloqueado(Notification.permission === "denied");

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPrecisaInstalar(ehIos && !rodandoInstalado);
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
        setBloqueado(permission === "denied");
        setStatus(permission === "denied" ? "O navegador bloqueou as notificações. Se esta é uma janela anônima, abra o FARO numa janela normal: o modo anônimo não permite notificações. Senão, libere nas configurações do site (cadeado ao lado do endereço)." : "Você fechou o pedido sem permitir. Toque em ativar de novo e escolha Permitir.");
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
    <CollapsibleBox title="Notificações push" icon={<BellIcon />} resumo="Avisos do FARO no celular">
      <div className="hint-text">
        O lembrete chega na tela do celular, mesmo com o FARO fechado — como a notificação de qualquer app. Vale pra todo
        lembrete que tenha data e hora, mesmo sem o zap aceso; o WhatsApp fica só pros que você acender.
      </div>
      {!supported ? (
        precisaInstalar ? (
          <PushPassos
            titulo="Primeiro, instale o FARO na tela inicial"
            porque="No iPhone, o aviso só chega com o FARO instalado — numa aba do Safari ou do Chrome o iOS não oferece isso."
            passos={[
              <>Abra o FARO no <strong>Safari</strong> (a instalação precisa ser por ele).</>,
              <>Toque em <strong>Compartilhar</strong> (o quadrado com a seta pra cima) e em <strong>Adicionar à Tela de Início</strong>.</>,
              <>Deixe <strong>&ldquo;Abrir como app da Web&rdquo;</strong> ligado e toque em <strong>Adicionar</strong>.</>,
              <>Abra o FARO pelo <strong>ícone novo</strong> da tela inicial (não pelo Safari) e volte aqui.</>,
            ]}
          />
        ) : (
          <div className="hint-text">
            {plataforma === "android"
              ? "Esse navegador não oferece notificações. No Android, use o Chrome."
              : "Esse navegador não oferece notificações push. Tente o Chrome, o Edge ou o Safari atualizados."}
          </div>
        )
      ) : (
        <>
          <div className="settings-toggle-row">
            <span>
              <span className="settings-label">Receber lembretes como notificação</span>
              <span className="settings-toggle-hint">
                {subscribed ? "Ligado neste aparelho." : "Desligado neste aparelho. Ligue e toque em Permitir."}
              </span>
            </span>
            <ToggleSwitch
              checked={subscribed}
              onChange={(v) => (v ? enable() : disable())}
              ariaLabel="Notificações push"
            />
          </div>
          {bloqueado && !subscribed && (
            <PushPassos
              titulo="As notificações estão bloqueadas neste aparelho"
              porque="Você (ou o navegador) negou a permissão antes. É preciso liberar nas configurações do aparelho:"
              passos={
                plataforma === "ios"
                  ? [
                      <>Abra o app <strong>Ajustes</strong> do iPhone e vá em <strong>Notificações</strong>.</>,
                      <>Procure o <strong>FARO</strong> e ligue <strong>Permitir notificações</strong>.</>,
                      <>Volte ao FARO e ligue a chave acima.</>,
                    ]
                  : plataforma === "android"
                    ? [
                        <>Segure o ícone do <strong>FARO</strong> e toque em <strong>Informações do app</strong> (ou, no Chrome, no cadeado ao lado do endereço).</>,
                        <>Entre em <strong>Notificações</strong> e libere.</>,
                        <>Volte ao FARO e ligue a chave acima.</>,
                      ]
                    : [
                        <>Clique no <strong>cadeado</strong> ao lado do endereço do site.</>,
                        <>Em <strong>Notificações</strong>, escolha <strong>Permitir</strong>.</>,
                        <>Recarregue a página e ligue a chave acima.</>,
                      ]
              }
            />
          )}
          {plataforma === "android" && !instalado && !bloqueado && (
            <div className="hint-text">
              Dica: pra o aviso chegar com mais segurança com o FARO fechado, instale-o — no Chrome, toque nos três
              pontinhos e em <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>).
            </div>
          )}
          {subscribed && (
            <>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={sendTest}>
                Testar notificação
              </button>
              <div className="hint-text">
                Pra testar de verdade: toque em testar, feche o FARO e espere. A notificação deve aparecer na tela do
                celular em alguns segundos.
              </div>
            </>
          )}
          {status && <div className="hint-text">{status}</div>}
        </>
      )}
    </CollapsibleBox>
  );
}

/** Instrução numerada. Um passo por linha: é pra ser seguida com o celular na mão. */
function PushPassos({ titulo, porque, passos }: { titulo: string; porque: string; passos: ReactNode[] }) {
  return (
    <div className="push-passos">
      <div className="push-passos-titulo">{titulo}</div>
      <div className="hint-text">{porque}</div>
      <ol>
        {passos.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>
    </div>
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
    <CollapsibleBox title="Backup completo do app (.json)" icon={<ArchiveIcon />} resumo="Todas as áreas, para guardar ou restaurar">
      {/* O formato entra no título e no botão porque foi exatamente o que o
          confundiu: ele clicou no bloco chamado "Backup" esperando o .zip dos
          textos e baixou um .json. Dois blocos começando com a mesma palavra,
          um ao lado do outro — a culpa é do nome, não dele. */}
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Este é o <strong>cofre</strong> (baixado na mão): um arquivo técnico com tudo, pra
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

// Backup automático no computador. Um script agendado (Mac ou Windows) busca o
// backup completo uma vez por dia e grava na pasta do Google Drive que o "Drive
// para computador" já sincroniza — o FARO não escreve no Drive de ninguém. Se o
// computador ficou desligado e o dia passou sem backup, o servidor manda um push
// às 18h. Por enquanto é só do dono; o desenho para clientes vem depois.
const PASTA_DO_DRIVE = "LEANDRO GAROZI/Claude - IA/Apps Leandro Garozi/App faro/Backups";
const PASTA_DO_APRENDIZADO = "LEANDRO GAROZI/Claude - IA/Apps Leandro Garozi/App faro/Aprendizado (cópia automática)";

type EstadoDoBackupAuto = {
  configurado: boolean;
  token: string | null;
  ultimoEm: string | null;
  ultimoBytes: number | null;
  ultimasLinhas: number | null;
  ultimoArquivo: string | null;
  aprendizadoPedidoEm: string | null;
  aprendizadoEnviadoEm: string | null;
  aprendizadoArquivos: number | null;
};

type ResultadoDaRestauracao = {
  ok: boolean;
  erro?: string;
  simulado?: boolean;
  dia?: string;
  restauradas?: number;
  ja_existiam?: number;
  por_tabela?: Record<string, number>;
  falhas?: { tabela: string; erro: string }[];
};

/**
 * Restaurador da conta do dono, a partir da cópia diária guardada no banco. Sempre simula primeiro: só depois de
 * ver o que voltaria é que o botão de restaurar de verdade aparece. Nunca sobrescreve o que existe hoje.
 */
function RestauradorBox() {
  const { askConfirm } = useBoardCtx();
  const [copias, setCopias] = useState<{ dia: string; tabelas: number; linhas: number }[] | null>(null);
  const [dia, setDia] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [res, setRes] = useState<ResultadoDaRestauracao | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/backup/restaurar-conta")
      .then((r) => r.json())
      .then((j) => {
        if (!vivo || !j.ok) return;
        setCopias(j.copias);
        if (j.copias[0]) setDia(j.copias[0].dia);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  async function rodar(simular: boolean) {
    setOcupado(true);
    try {
      const r = await fetch("/api/backup/restaurar-conta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dia, simular }) });
      setRes(await r.json());
    } catch {
      setRes({ ok: false, erro: "Não consegui falar com o servidor." });
    } finally {
      setOcupado(false);
    }
  }

  const podeRestaurar = res?.ok === true && res.simulado === true && res.dia === dia && (res.restauradas ?? 0) > 0;

  return (
    <CollapsibleBox title="Restaurar do backup diário" icon={<ArchiveIcon />} resumo="Traz de volta o que foi apagado sem querer">
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Usa a cópia diária que o FARO guarda no banco. <strong>Só traz de volta o que sumiu</strong> desde aquele dia; nada do que existe hoje é sobrescrito. Primeiro
        simule, para ver o que voltaria.
      </div>
      {copias === null ? (
        <div className="hint-text">Carregando as cópias...</div>
      ) : copias.length === 0 ? (
        <div className="hint-text">Ainda não há cópia diária.</div>
      ) : (
        <>
          <select className="input" value={dia} onChange={(e) => { setDia(e.target.value); setRes(null); }}>
            {copias.map((c) => (
              <option key={c.dia} value={c.dia}>
                {c.dia.split("-").reverse().join("/")} ({c.linhas} linhas em {c.tabelas} tabelas)
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-accent" disabled={ocupado || !dia} onClick={() => rodar(true)}>
              {ocupado ? "Calculando..." : "Simular (não grava nada)"}
            </button>
            {podeRestaurar && (
              <button
                type="button"
                className="btn btn-danger"
                disabled={ocupado}
                onClick={() =>
                  askConfirm(`Trazer de volta ${res?.restauradas} item(ns) que sumiram desde a cópia de ${dia.split("-").reverse().join("/")}? O que existe hoje não é alterado.`, () => rodar(false))
                }
              >
                Restaurar de verdade
              </button>
            )}
          </div>
        </>
      )}
      {res && (
        <div className="hint-text" style={{ marginTop: 10 }}>
          {!res.ok ? (
            <strong>{res.erro}</strong>
          ) : (
            <>
              <strong>{res.simulado ? "Simulação: voltariam" : "Restaurado:"} {res.restauradas} item(ns)</strong>; {res.ja_existiam} já estavam na conta.
              {Object.entries(res.por_tabela ?? {}).length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {Object.entries(res.por_tabela ?? {}).map(([t, n]) => (
                    <li key={t}>
                      {t}: {n}
                    </li>
                  ))}
                </ul>
              )}
              {(res.falhas ?? []).length > 0 && <div style={{ marginTop: 6 }}>Não deu para trazer: {(res.falhas ?? []).map((f) => `${f.tabela} (${f.erro})`).join("; ")}</div>}
            </>
          )}
        </div>
      )}
    </CollapsibleBox>
  );
}

type SituacaoDoGoogle = {
  ok: boolean;
  disponivel?: boolean;
  conectado?: boolean;
  precisaReconectar?: boolean;
  email?: string | null;
  agendaId?: string;
  agendaNome?: string | null;
  erro?: string | null;
  agendas?: { id: string; nome: string; principal: boolean }[];
};

const MENSAGENS_DO_GOOGLE: Record<string, string> = {
  ok: "Pronto! Seu Google está conectado.",
  negado: "A conexão foi cancelada. Se foi sem querer, clique em Conectar de novo.",
  erro: "Não consegui conectar. Tente de novo; se repetir, avise pelo Canal de feedback.",
  indisponivel: "A conexão com o Google ainda não está ligada neste FARO.",
  "sem-agenda": "Não encontrei uma agenda em que o FARO possa gravar nessa conta.",
};

/**
 * "Conectar com o Google": o FARO passa a gravar as reuniões e eventos na agenda da própria pessoa, e os convidados
 * recebem o convite do Google. Mão única por enquanto (FARO → Google).
 */
function GoogleAgendaBox() {
  const [sit, setSit] = useState<SituacaoDoGoogle | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    try {
      const r = await fetch("/api/google/status");
      setSit(await r.json());
    } catch {
      setSit({ ok: false });
    }
  }

  useEffect(() => {
    let vivo = true;
    fetch("/api/google/status")
      .then((r) => r.json())
      .then((j) => vivo && setSit(j))
      .catch(() => vivo && setSit({ ok: false }));
    try {
      const volta = window.sessionStorage.getItem("faro:google-retorno");
      if (volta) {
        window.sessionStorage.removeItem("faro:google-retorno");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- recado único da volta do Google, lido do armazenamento do navegador
        setAviso(MENSAGENS_DO_GOOGLE[volta] ?? null);
      }
    } catch {
      /* sem armazenamento: só não mostra o recado */
    }
    return () => {
      vivo = false;
    };
  }, []);

  async function trocarAgenda(agendaId: string) {
    setOcupado(true);
    await fetch("/api/google/agenda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agendaId }) }).catch(() => {});
    await carregar();
    setOcupado(false);
  }

  async function desconectar() {
    setOcupado(true);
    await fetch("/api/google/desconectar", { method: "POST" }).catch(() => {});
    await carregar();
    setOcupado(false);
  }

  const conectado = sit?.conectado === true;
  return (
    <CollapsibleBox title="Agenda do Google" icon={<CalendarCheckIcon />} resumo={conectado ? `Conectada${sit?.email ? ` (${sit.email})` : ""}` : "Reuniões e eventos na sua agenda, com convidados"}>
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Conectando, o FARO grava suas <strong>reuniões e eventos</strong> na sua agenda do Google. Se a reunião tiver <strong>convidados</strong>, o Google manda o convite
        por e-mail. Vai só do FARO para o Google: o que você criar direto no Google ainda não aparece aqui.
      </div>
      {aviso && <div className="hint-text" style={{ marginBottom: 8 }}><strong>{aviso}</strong></div>}
      {sit === null ? (
        <div className="hint-text">Carregando...</div>
      ) : sit.disponivel === false ? (
        <div className="hint-text">Ainda não está ligado neste FARO.</div>
      ) : !conectado ? (
        <>
          <a className="btn btn-accent" href="/api/google/conectar">Conectar com o Google</a>
          <div className="hint-text">
            Nesta fase o Google mostra o aviso “O Google não verificou este app”: é normal. Toque em “Avançado” e depois em “Acessar FARO”. Se aparecer “acesso bloqueado”, mande o seu e-mail do Google pelo Canal de feedback.
          </div>
        </>
      ) : (
        <>
          {sit.precisaReconectar && (
            <div className="hint-text" style={{ marginBottom: 8 }}>
              <strong>O Google retirou a permissão.</strong> <a href="/api/google/conectar">Conectar de novo</a>.
            </div>
          )}
          {sit.erro && !sit.precisaReconectar && <div className="hint-text" style={{ marginBottom: 8 }}>Último problema: {sit.erro}</div>}
          {(sit.agendas ?? []).length > 1 && (
            <label style={{ display: "block", marginBottom: 8 }}>
              <span className="settings-label">Gravar na agenda</span>
              <select className="input" value={sit.agendaId} disabled={ocupado} onChange={(e) => trocarAgenda(e.target.value)}>
                {(sit.agendas ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={desconectar}>
            Desconectar
          </button>
          <div className="hint-text">Desconectar não apaga os eventos que já estão na sua agenda.</div>
        </>
      )}
    </CollapsibleBox>
  );
}

function BackupAutomaticoBox() {
  const [estado, setEstado] = useState<EstadoDoBackupAuto | null>(null);
  const [so, setSo] = useState<"mac" | "win">("mac");
  const [mostrar, setMostrar] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agora] = useState(() => Date.now());
  const [pedindo, setPedindo] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/backup/chave")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`O servidor respondeu ${r.status}`))))
      .then((d: EstadoDoBackupAuto) => vivo && setEstado(d))
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : "Falha ao ler o estado do backup"));
    return () => {
      vivo = false;
    };
  }, []);

  async function gerarChave() {
    setErro(null);
    try {
      const r = await fetch("/api/backup/chave", { method: "POST" });
      if (!r.ok) throw new Error(`O servidor respondeu ${r.status}`);
      const { token } = (await r.json()) as { token: string };
      setEstado((e) => ({
        configurado: true,
        token,
        ultimoEm: e?.ultimoEm ?? null,
        ultimoBytes: e?.ultimoBytes ?? null,
        ultimasLinhas: e?.ultimasLinhas ?? null,
        ultimoArquivo: e?.ultimoArquivo ?? null,
        aprendizadoPedidoEm: e?.aprendizadoPedidoEm ?? null,
        aprendizadoEnviadoEm: e?.aprendizadoEnviadoEm ?? null,
        aprendizadoArquivos: e?.aprendizadoArquivos ?? null,
      }));
      setMostrar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar a chave");
    }
  }

  async function enviarParaODrive() {
    setErro(null);
    setPedindo(true);
    try {
      const r = await fetch("/api/backup/pedido", { method: "POST" });
      if (!r.ok) throw new Error(`O servidor respondeu ${r.status}`);
      setEstado((e) => (e ? { ...e, aprendizadoPedidoEm: new Date().toISOString() } : e));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao pedir o envio");
    } finally {
      setPedindo(false);
    }
  }

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const comando = !estado?.token
    ? ""
    : so === "mac"
      ? `bash -c "$(curl -fsSL '${base}/api/backup/instalar?so=mac')" _ '${estado.token}' '${PASTA_DO_DRIVE}' '${PASTA_DO_APRENDIZADO}'`
      : `& ([scriptblock]::Create((irm '${base}/api/backup/instalar?so=win'))) -Token '${estado.token}' -Pasta '${PASTA_DO_DRIVE}' -PastaAprendizado '${PASTA_DO_APRENDIZADO}'`;

  async function copiar(ensaio = false) {
    try {
      await navigator.clipboard.writeText(ensaio ? `FARO_SIMULAR=1 ${comando}` : comando);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não consegui copiar sozinho. Selecione o comando e copie na mão.");
    }
  }

  const ultimo = estado?.ultimoEm ? new Date(estado.ultimoEm) : null;
  const horasDesde = ultimo ? (agora - ultimo.getTime()) / 3600000 : null;
  const atrasado = horasDesde !== null && horasDesde > 30;
  const mb = estado?.ultimoBytes ? (estado.ultimoBytes / 1048576).toFixed(2).replace(".", ",") : null;

  return (
    <CollapsibleBox title="Backup automático no meu computador" icon={<ArchiveIcon />} resumo="Cópia diária feita no seu computador">
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Todo dia o seu computador busca o backup completo (guarda os 7 últimos) e os textos de aprendizado, e
        grava tudo na pasta do Drive. Se o computador estiver desligado e o dia passar sem backup, o FARO avisa no
        celular às 18h.
      </div>

      <div className="backup-saidas">
        <div className="backup-saida">
          <strong>1. Cofre (.json)</strong>
          <span>
            Tudo do app, para restaurar se algo der errado. Ninguém lê. Pasta <code>{PASTA_DO_DRIVE}</code>, os 7
            mais recentes.
          </span>
        </div>
        <div className="backup-saida">
          <strong>2. Aprendizados (.md)</strong>
          <span>
            Sinapses, livros, ideias e Conhecendo você em texto, <strong>é esta pasta que a minha IA lê</strong>. Pasta{" "}
            <code>{PASTA_DO_APRENDIZADO}</code>.
          </span>
        </div>
      </div>

      {estado?.configurado ? (
        ultimo ? (
          <div className={atrasado ? "wa-cost-warn" : "hint-text"} style={{ marginTop: 0 }}>
            {atrasado && <WarningIcon />} Último backup:{" "}
            <strong>
              {ultimo.toLocaleDateString("pt-BR")} às {ultimo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </strong>
            {mb ? ` · ${mb} MB` : ""}
            {estado.ultimasLinhas ? ` · ${estado.ultimasLinhas.toLocaleString("pt-BR")} linhas` : ""}
            {atrasado ? " — faz mais de um dia. Ligue o computador e abra o Drive." : ""}
          </div>
        ) : (
          <div className="hint-text" style={{ marginTop: 0 }}>
            Chave criada, mas nenhum backup chegou ainda. Rode o comando abaixo no computador.
          </div>
        )
      ) : (
        <div className="hint-text" style={{ marginTop: 0 }}>
          Ainda não ligado.
        </div>
      )}

      {estado?.configurado && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={enviarParaODrive}
            disabled={pedindo || !!estado.aprendizadoPedidoEm}
          >
            {estado.aprendizadoPedidoEm ? "Pedido feito, aguardando o computador…" : "Enviar aprendizados para o Drive agora"}
          </button>
          <div className="hint-text" style={{ marginTop: 6 }}>
            {estado.aprendizadoPedidoEm
              ? "O seu computador (precisa estar ligado) confere a cada 15 minutos e grava os textos na pasta do Drive."
              : estado.aprendizadoEnviadoEm
                ? `Último envio dos aprendizados: ${new Date(estado.aprendizadoEnviadoEm).toLocaleDateString("pt-BR")} às ${new Date(estado.aprendizadoEnviadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}${estado.aprendizadoArquivos ? ` (${estado.aprendizadoArquivos} arquivos)` : ""}. Também vai sozinho todo dia.`
                : "Também vai sozinho todo dia, junto com o backup."}
          </div>
        </div>
      )}

      <div className="edit-actions" style={{ justifyContent: "flex-start", gap: 8, marginTop: 8 }}>
        {!estado?.configurado ? (
          <button type="button" className="btn btn-accent" onClick={gerarChave}>
            Ligar o backup automático
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setMostrar((v) => !v)}>
            {mostrar ? "Esconder o comando" : "Instalar em um computador"}
          </button>
        )}
      </div>

      {mostrar && estado?.token && (
        <PushPassos
          titulo="Instalar neste computador"
          porque="Faça isto em cada computador que fica ligado (estúdio e notebook). A chave é a mesma e vale para os dois. Para atualizar um computador que já tem o backup, é só repetir: não duplica nem apaga nada, só troca o programa por um novo."
          passos={[
            <span key="so">
              Escolha o seu sistema:{" "}
              <button type="button" className={"btn btn-ghost" + (so === "mac" ? " active" : "")} onClick={() => setSo("mac")}>
                Mac
              </button>{" "}
              <button type="button" className={"btn btn-ghost" + (so === "win" ? " active" : "")} onClick={() => setSo("win")}>
                Windows
              </button>
            </span>,
            so === "mac" ? (
              <span key="a">
                Abra o app <strong>Terminal</strong> (aperte Cmd+Espaço e digite Terminal).
              </span>
            ) : (
              <span key="a">
                Abra o <strong>PowerShell</strong> (menu Iniciar, digite PowerShell).
              </span>
            ),
            <span key="b">
              {so === "mac" && (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => copiar(true)}>
                    Copiar o comando de ENSAIO
                  </button>{" "}
                  (opcional, recomendado na primeira vez): cole e aperte Enter. Ele só <strong>mostra</strong> quais
                  pastas usaria e o que instalaria; não cria nada.
                  <br />
                </>
              )}
              <button type="button" className="btn btn-accent" onClick={() => copiar()}>
                {copiado ? "Copiado!" : "Copiar o comando"}
              </button>{" "}
              e cole na janela, depois aperte <strong>Enter</strong>.
            </span>,
            <span key="c">
              Ele mostra <strong>&quot;Pronto. Backup guardado em…&quot;</strong>. O primeiro backup já sai na hora.
            </span>,
            <span key="d">
              O computador precisa ter o app <strong>Drive para computador</strong> do Google para as pastas subirem
              ao Drive. Backups: <strong>{PASTA_DO_DRIVE}</strong>. Textos de aprendizado:{" "}
              <strong>{PASTA_DO_APRENDIZADO}</strong>.
            </span>,
          ]}
        />
      )}

      {mostrar && estado?.token && (
        <div className="hint-text">
          O comando contém a sua chave pessoal de backup: não mande para ninguém. Se vazar, clique em &quot;Gerar nova
          chave&quot; — a antiga para de valer e é preciso rodar o comando novo nos computadores.{" "}
          <button type="button" className="btn btn-ghost" onClick={gerarChave}>
            Gerar nova chave
          </button>
        </div>
      )}

      {erro && (
        <div className="wa-cost-warn">
          <WarningIcon /> {erro}
        </div>
      )}
    </CollapsibleBox>
  );
}

// Conector FARO: o endereço que a IA do Leandro (Claude) usa para LER o cérebro
// do FARO. A chave vai no próprio endereço; gerar outra derruba a anterior.
function ConectorFaroBox() {
  const [estado, setEstado] = useState<{ token: string | null; usadoEm: string | null; chamadas: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/conector/chave")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`O servidor respondeu ${r.status}`))))
      .then((d) => vivo && setEstado(d))
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : "Falha ao ler o conector"));
    return () => {
      vivo = false;
    };
  }, []);

  async function gerar() {
    if (estado?.token && !window.confirm("Gerar um endereço novo desliga o atual. Você vai precisar trocar o endereço no Claude. Continuar?")) return;
    setErro(null);
    try {
      const r = await fetch("/api/conector/chave", { method: "POST" });
      if (!r.ok) throw new Error(`O servidor respondeu ${r.status}`);
      const { token } = (await r.json()) as { token: string };
      setEstado({ token, usadoEm: null, chamadas: 0 });
      setMostrar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar o endereço");
    }
  }

  const endereco = estado?.token && typeof window !== "undefined" ? `${window.location.origin}/api/mcp/${estado.token}` : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não consegui copiar sozinho. Selecione o endereço e copie na mão.");
    }
  }

  return (
    <CollapsibleBox title="Conector FARO (minha IA lê o FARO)" icon={<LinkIcon />} resumo="Sua IA lê o FARO, somente leitura">
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Liga o Claude ao FARO: ele passa a buscar e ler o que você aprovou em Conhecendo você, as sinapses, as ideias
        e as anotações dos livros, sem você precisar apontar pasta nenhuma. Ele também pode criar aniversários, tarefas
        e lembretes, mas só depois de mostrar o que vai criar e você confirmar. Nunca edita nem apaga o que já existe.
        Saúde e medicamentos ficam de fora. É opcional: precisa de uma conta do Claude que aceite conectores
        personalizados (planos pagos). Sem isso o FARO funciona normalmente.
      </div>

      {estado?.token ? (
        <div className="hint-text" style={{ marginTop: 0 }}>
          {estado.usadoEm
            ? `Ligado. Última consulta da IA: ${new Date(estado.usadoEm).toLocaleDateString("pt-BR")} às ${new Date(estado.usadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} (${estado.chamadas} consultas).`
            : "Endereço criado. A IA ainda não consultou."}
        </div>
      ) : (
        <div className="hint-text" style={{ marginTop: 0 }}>
          Ainda não ligado.
        </div>
      )}

      <div className="edit-actions" style={{ justifyContent: "flex-start", gap: 8, marginTop: 8 }}>
        {estado?.token ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setMostrar((v) => !v)}>
              {mostrar ? "Esconder o endereço" : "Mostrar o endereço e os passos"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={gerar}>
              Gerar endereço novo
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-accent" onClick={gerar}>
            Criar o endereço do conector
          </button>
        )}
      </div>

      {mostrar && endereco && (
        <PushPassos
          titulo="Ligar no Claude"
          porque="Faça uma vez, no computador (vale para o Claude do celular também). O endereço é a chave: não mande para ninguém."
          passos={[
            <span key="copiar">
              Copie o endereço:{" "}
              <button type="button" className="btn btn-ghost" onClick={copiar}>
                {copiado ? "Copiado" : "Copiar endereço"}
              </button>
              <code style={{ display: "block", wordBreak: "break-all", marginTop: 6 }}>{endereco}</code>
            </span>,
            <span key="abrir">
              No claude.ai, abra <strong>Configurações → Conectores</strong> e clique em{" "}
              <strong>Adicionar conector personalizado</strong>.
            </span>,
            <span key="colar">
              Nome: <strong>FARO</strong>. Em URL, cole o endereço. Não precisa preencher mais nada. Clique em{" "}
              <strong>Adicionar</strong>.
            </span>,
            <span key="testar">
              Numa conversa nova, ligue o FARO no menu de ferramentas e pergunte: <em>&quot;O que o FARO sabe sobre mim?&quot;</em> Para criar, peça: <em>&quot;adiciona no FARO o aniversário do João, 20/03&quot;</em>.
            </span>,
          ]}
        />
      )}

      {erro && (
        <div className="wa-cost-warn">
          <WarningIcon /> {erro}
        </div>
      )}
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
  // Os cadastros pelo site não ficam no estado do app: busca aqui, uma vez, para a contagem e o .zip.
  const [crm, setCrm] = useState<DadosDoBackup["crm"]>(undefined);
  useEffect(() => {
    const sb = createClient();
    void Promise.all([
      sb.from("clientes_cadastro").select("*").order("criado_em"),
      sb.from("cadastro_links").select("*").order("criado_em"),
    ]).then(([c, l]) => {
      if (!c.error && !l.error) setCrm({ clientes: c.data ?? [], links: l.data ?? [] });
    });
  }, []);
  const nome = nomeDraft ?? backupName ?? "";

  const dados: DadosDoBackup = {
    livros: board.state.books.filter((b) => b.kind === "livro"),
    sinapses: board.state.synapses.filter((s) => s.kind !== "ideia"),
    ideias: board.state.synapses.filter((s) => s.kind === "ideia"),
    partesDeEstudo: board.state.synapseParts,
    conhecendo: board.state.knowledgeItems.filter((k) => k.status === "aprovado").map(conhecimentoParaExportar),
    conhecendoSuperados: board.state.knowledgeItems
      .filter((k) => k.status === "superado")
      .map((k) => {
        const novo = board.state.knowledgeItems.find((x) => x.id === k.supersededBy);
        return { ...conhecimentoParaExportar(k), superadoEm: k.supersededAt ?? "", superadoPor: novo ? { id: novo.id, titulo: novo.titulo } : null };
      }),
    aniversarios: board.state.birthdays,
    crm,
    metanoia: board.state.metanoiaFrases,
  };

  // Quantos TÊM anotação, por área — o número que importa, porque é o que vai
  // sair. Mostrar "47 livros" prometeria 47 arquivos e sairiam 4.
  const comAnotacao = {
    sinapses: dados.sinapses.filter((x) => temConteudo(x.learning) || temConteudo(x.questions)).length,
    ideias: dados.ideias.filter((x) => temConteudo(x.learning)).length,
    conhecendo: dados.conhecendo.length,
    livros: dados.livros.filter((x) => temConteudo(x.insights)).length,
    aniversarios: board.state.birthdays.length,
    crm: crm?.clientes.length ?? 0,
    metanoia: board.state.metanoiaFrases.filter((f) => f.status === "aprovada").length,
  };
  const totalNaArea = {
    sinapses: dados.sinapses.length,
    livros: dados.livros.length,
    ideias: dados.ideias.length,
    conhecendo: board.state.knowledgeItems.filter((k) => k.status !== "descartado" && k.status !== "superado").length,
    aniversarios: board.state.birthdays.length,
    crm: crm?.clientes.length ?? 0,
    metanoia: board.state.metanoiaFrases.filter((f) => f.status !== "arquivada").length,
  };
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
    <CollapsibleBox title="Backup de aprendizado (.zip de textos)" icon={<BookOpenIcon />} resumo="Sinapses, ideias, estudos e livros em Markdown">
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
                {comAnotacao[a.id]} {a.id === "aniversarios" || a.id === "crm" ? "cadastrados" : a.id === "metanoia" ? "aprovadas" : "com anotação"}
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
        O .zip é baixado pra você guardar onde quiser. Com o backup automático ligado, o seu computador também grava
        esses textos sozinho na pasta de aprendizado do Drive, sem mexer nas outras pastas que você já tem: o FARO
        não escreve na sua nuvem, quem grava é o seu computador.
      </div>
    </CollapsibleBox>
  );
}

function IaCostBox() {
  const { board } = useBoardCtx();
  const { iaMonthlyCapBrl: capEscolhido } = board.state.settings;
  // Quem não é dono usa a IA paga pelo dono: o servidor limita o teto (ver limitesDaIa) e a tela mostra o mesmo número.
  const iaMonthlyCapBrl = board.state.settings.featureFlags.modo_dono === true ? capEscolhido : Math.min(capEscolhido, TETO_MAXIMO_DE_TESTADOR_BRL);
  const resumo = useIaCost();
  const [capInput, setCapInput] = useState<string | null>(null);

  const gasto = resumo?.noMes.custoBrl ?? 0;
  const pct = iaMonthlyCapBrl > 0 ? Math.min(100, (gasto / iaMonthlyCapBrl) * 100) : 100;
  const noTeto = gasto >= iaMonthlyCapBrl;
  const anteriores = (resumo?.meses ?? []).filter((m) => !m.ehAtual && m.conversas > 0);

  function commitCap() {
    if (capInput === null) return;
    const valor = Number(capInput.trim().replace(",", "."));
    if (Number.isFinite(valor) && valor >= 0) board.updateSettings({ iaMonthlyCapBrl: valor });
    setCapInput(null);
  }

  return (
    <CollapsibleBox title="Custo da IA" icon={<BoltIcon />} resumo="O que a IA do app gastou no mês">
      {board.state.settings.featureFlags.modo_dono !== true && (
        <div className="aviso-box" style={{ marginBottom: 8 }}>
          Este painel só passa a contar o gasto da <strong>sua própria IA</strong> depois que você conectar a sua conta de IA (em breve). Até lá, a conversa usa a IA do FARO, dentro do teto abaixo.
        </div>
      )}
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Quanto a conversa do FARO (o mascote) gastou com a API da Anthropic. O servidor soma cada fala e{" "}
        <strong>para de responder ao chegar no teto</strong>; o resto do app não depende disso.
      </div>
      {resumo === null ? (
        <div className="hint-text">Carregando o uso...</div>
      ) : (
        <>
          <div className="wa-cost-grid">
            <div className="wa-cost-card">
              <div className="wa-cost-value">{resumo.noMes.conversas}</div>
              <div className="wa-cost-label">Respostas no mês</div>
            </div>
            <div className="wa-cost-card">
              <div className="wa-cost-value">{fmtBRL(Math.round(gasto * 100))}</div>
              <div className="wa-cost-label">Gasto no mês</div>
            </div>
            <div className="wa-cost-card">
              <div className="wa-cost-value">{Math.round((resumo.noMes.tokensEntrada + resumo.noMes.tokensSaida) / 1000)} mil</div>
              <div className="wa-cost-label">Tokens no mês</div>
            </div>
          </div>
          <div className="wa-cap-bar">
            <div className={"wa-cap-fill" + (noTeto ? " over" : "")} style={{ width: `${pct}%` }} />
          </div>
          <div className={"wa-cap-label" + (noTeto ? " over" : "")}>
            {noTeto
              ? "Teto do mês atingido: o mascote não responde até o mês virar ou o teto subir."
              : `${fmtBRL(Math.round(gasto * 100))} de ${fmtBRL(Math.round(iaMonthlyCapBrl * 100))} do teto`}
          </div>
          {anteriores.length > 0 && (
            <div className="hint-text">
              {anteriores.map((m) => `${m.rotulo}: ${fmtBRL(Math.round(m.custoBrl * 100))} (${m.conversas} respostas)`).join(" · ")}
            </div>
          )}
        </>
      )}
      <div className="settings-row-standalone">
        <span className="settings-label">Teto de gasto no mês (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          className="budget-input"
          value={capInput ?? String(iaMonthlyCapBrl)}
          onChange={(e) => setCapInput(e.target.value)}
          onBlur={commitCap}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>
      <div className="hint-text">
        O valor usa os preços de tabela do modelo e o dólar ajustado em Custo do WhatsApp. A fatura de verdade está no
        console da Anthropic.
      </div>
    </CollapsibleBox>
  );
}

/** Aceite de receber WhatsApp e saldo de mensagens. O dono não depende de crédito (ver lib/whatsapp/credito.ts). */
function WhatsAppCreditoBlock() {
  const { board } = useBoardCtx();
  const supabase = useMemo(() => createClient(), []);
  const flags = board.state.settings.featureFlags;
  const dono = flags.modo_dono === true;
  const aceitou = flags.whatsapp_aceite === true;
  const [saldo, setSaldo] = useState<number | null>(null);
  const [pedido, setPedido] = useState<"" | "enviando" | "enviado" | "erro">("");

  useEffect(() => {
    if (dono) return;
    let vivo = true;
    (async () => {
      const [{ data: cred }, { count }] = await Promise.all([
        supabase.from("whatsapp_creditos").select("mensagens_concedidas").maybeSingle(),
        supabase.from("whatsapp_sends").select("id", { count: "exact", head: true }).eq("ok", true),
      ]);
      if (vivo) setSaldo(saldoDe(cred?.mensagens_concedidas, count ?? 0));
    })();
    return () => {
      vivo = false;
    };
  }, [dono, supabase]);

  if (dono) return null;
  return (
    <div className="wa-credito">
      <label className="wa-credito-aceite">
        <ToggleSwitch
          checked={aceitou}
          ariaLabel="Aceito receber lembretes por WhatsApp"
          onChange={(v) => board.updateSettings({ featureFlags: { ...flags, whatsapp_aceite: v } })}
        />
        <span>
          Aceito receber lembretes por WhatsApp no número do meu Perfil. O FARO só manda do que eu ligar com o ícone do zap, e eu posso desligar quando quiser.
        </span>
      </label>
      <div className="wa-credito-saldo">
        {saldo === null ? "Conferindo seu crédito…" : saldo > 0 ? `Seu crédito: ${saldo} mensagens.` : "Você está sem crédito de mensagens. Os lembretes continuam chegando por notificação no celular."}
      </div>
      <div className="wa-pacotes">
        <div className="wa-pacotes-titulo">Quer mais mensagens? Pacotes:</div>
        {PACOTES_DE_CREDITO.map((p) => (
          <div key={p.mensagens} className="wa-pacote">
            <span>
              <b>{p.mensagens} mensagens</b> · R$ {p.preco}
              <small>{p.dura}</small>
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={pedido === "enviando"}
              onClick={async () => {
                setPedido("enviando");
                try {
                  const res = await fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tipo: "credito", texto: `Quero o pacote de ${p.mensagens} mensagens (R$ ${p.preco}). Saldo atual: ${saldo ?? "?"}.`, pagina: "configuracoes" }),
                  });
                  setPedido(res.ok ? "enviado" : "erro");
                } catch {
                  setPedido("erro");
                }
              }}
            >
              Pedir
            </button>
          </div>
        ))}
        <small className="wa-pacotes-nota">
          {pedido === "enviado"
            ? "Pedido enviado. Quem te convidou combina o Pix com você e soma o crédito."
            : pedido === "erro"
              ? "Não deu para enviar agora."
              : "Ao pedir, quem te convidou combina o pagamento (Pix) com você e soma o crédito."}
        </small>
      </div>
    </div>
  );
}

/** Só o dono: crédito de WhatsApp de cada pessoa. Soma mensagens depois de combinar (Pix etc.). */
function CreditosDoZapBox() {
  type Pessoa = { user_id: string; email: string; nome: string; telefone: boolean; aceitou: boolean; dono: boolean; concedidas: number; usadas: number; saldo: number };
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [qtd, setQtd] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function carregar() {
    try {
      const res = await fetch("/api/admin/creditos", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setPessoas(((await res.json()) as { pessoas: Pessoa[] }).pessoas);
      setErro(null);
    } catch {
      setErro("Não consegui carregar a lista.");
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial da lista
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na primeira vez
  }, []);

  async function dar(p: Pessoa, fixo?: number) {
    const n = fixo ?? parseInt(qtd[p.user_id] ?? "", 10);
    if (!Number.isInteger(n) || n < 1) return;
    setOcupado(p.user_id);
    try {
      const res = await fetch("/api/admin/creditos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.user_id, mensagens: n }),
      });
      if (!res.ok) throw new Error();
      setQtd((q) => ({ ...q, [p.user_id]: "" }));
      await carregar();
    } catch {
      setErro("Não consegui somar o crédito.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <CollapsibleBox title="Créditos de WhatsApp das pessoas" icon={<WhatsAppIcon />} resumo="Somar mensagens depois do Pix combinado">
      <div className="hint-text" style={{ marginTop: 0 }}>
        Cada pessoa começa com {CREDITO_INICIAL} mensagens. Quando ela pagar (Pix etc.), some aqui a quantidade combinada.
      </div>
      {erro && <div className="auth-error">{erro}</div>}
      {pessoas === null ? (
        <div className="hint-text">Carregando…</div>
      ) : (
        <div className="cred-lista">
          {pessoas
            .filter((p) => !p.dono)
            .map((p) => (
              <div key={p.user_id} className="cred-linha">
                <div className="cred-quem">
                  <b>{p.nome || p.email || p.user_id.slice(0, 8)}</b>
                  <small>
                    {p.email} · {p.aceitou ? "aceitou" : "não aceitou"} · {p.telefone ? "com telefone" : "sem telefone"}
                  </small>
                </div>
                <div className="cred-saldo">
                  <b>{p.saldo}</b> restantes
                  <small>
                    {p.usadas} usadas de {p.concedidas}
                  </small>
                </div>
                <div className="cred-dar">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    className="budget-input"
                    placeholder="+50"
                    value={qtd[p.user_id] ?? ""}
                    onChange={(e) => setQtd((q) => ({ ...q, [p.user_id]: e.target.value }))}
                  />
                  <button type="button" className="btn btn-accent" disabled={ocupado === p.user_id} onClick={() => void dar(p)}>
                    Somar
                  </button>
                  {PACOTES_DE_CREDITO.map((k) => (
                    <button key={k.mensagens} type="button" className="btn btn-ghost" disabled={ocupado === p.user_id} title={`Pacote de R$ ${k.preco}`} onClick={() => void dar(p, k.mensagens)}>
                      +{k.mensagens}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          {pessoas.filter((p) => !p.dono).length === 0 && <div className="hint-text">Ainda não há outras pessoas.</div>}
        </div>
      )}
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
    <CollapsibleBox title="Custo do WhatsApp" icon={<WhatsAppIcon />} resumo="Mensagens, custo e teto do mês">
      <WhatsAppCreditoBlock />
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
// Estilo visual dos cartões: vale só neste aparelho (como o tema claro/escuro). "Clássico" é o de sempre.
const ESTILOS_VISUAIS = [
  { id: "classico", nome: "Clássico", desc: "O visual de sempre: cartões brancos de contorno suave." },
  { id: "suave", nome: "Suave", desc: "Cartões de vidro: translúcidos, com desfoque, cantos bem redondos e sombra macia." },
  { id: "flutuante", nome: "Cartão flutuante", desc: "Cartões brancos que flutuam, com sombra funda; a Metanoia vira um cartão roxo em destaque." },
] as const;

function inscreverEstilo(avisar: () => void) {
  const o = new MutationObserver(avisar);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-estilo"] });
  return () => o.disconnect();
}

// Escreve só no atributo (o observador acima re-renderiza) e guarda neste aparelho.
function gravarEstilo(id: string) {
  document.documentElement.dataset.estilo = id;
  try {
    window.localStorage.setItem("faro-estilo", id);
  } catch {
    // Sem armazenamento: vale só até recarregar.
  }
}

function EstiloVisualBox() {
  const { board } = useBoardCtx();
  const estilo = useSyncExternalStore(
    inscreverEstilo,
    () => document.documentElement.dataset.estilo ?? "classico",
    () => "classico"
  );
  const escolher = gravarEstilo;
  const cinza = (board.state.settings.bgTone ?? TOM_PADRAO) === SEM_COR;
  return (
    <CollapsibleBox title="Estilo dos cartões" icon={<PaletteIcon />} resumo="Clássico, Suave (vidro) ou Cartão flutuante. No escuro, os dois ficam em roxo profundo." abertoInicial>
      <div className="note-options-chips" role="group" aria-label="Estilo dos cartões">
        {ESTILOS_VISUAIS.map((e) => (
          <button key={e.id} type="button" className={"note-chip" + (estilo === e.id ? " active" : "")} aria-pressed={estilo === e.id} onClick={() => escolher(e.id)}>
            {e.nome}
          </button>
        ))}
      </div>
      <span className="hint-text">{ESTILOS_VISUAIS.find((e) => e.id === estilo)?.desc}</span>
      {estilo !== "classico" && !cinza && (
        <div className="edit-actions" style={{ justifyContent: "flex-start", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => board.updateSettings({ bgTone: SEM_COR })}>
            Usar fundo cinza liso
          </button>
          <span className="hint-text">Os estilos ficam mais bonitos sobre o cinza padrão. Você pode trocar o fundo em “Cor do fundo”.</span>
        </div>
      )}
    </CollapsibleBox>
  );
}

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

  // Cor personalizada: escolher no seletor só PRÉ-VISUALIZA. Ela só vale (e só fica guardada)
  // quando aperta "Salvar cor". Antes cada movimento do seletor gravava na hora, e a escolha
  // se perdia ao fechar e reabrir o FARO.
  const supabase = useMemo(() => createClient(), []);
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  useEffect(() => {
    if (rascunho === null) return;
    const n = intensidadeAtual;
    const raiz = document.documentElement.style;
    const tom = tomPorId(rascunho);
    raiz.setProperty("--fundo-claro", degradeDoFundo(tom, n, "claro"));
    raiz.setProperty("--fundo-escuro", degradeDoFundo(tom, n, "escuro"));
    return () => {
      // Sai do rascunho (salvou, descartou ou fechou a tela): volta ao que está guardado.
      const guardado = tomPorId(bgTone ?? TOM_PADRAO);
      raiz.setProperty("--fundo-claro", degradeDoFundo(guardado, n, "claro"));
      raiz.setProperty("--fundo-escuro", degradeDoFundo(guardado, n, "escuro"));
    };
  }, [rascunho, intensidadeAtual, bgTone]);

  async function salvarCor() {
    if (rascunho === null) return;
    const cor = rascunho;
    escolherTom(cor);
    setRascunho(null);
    setAviso(null);
    // Confere no banco: se não gravou, ele precisa saber na hora, não no dia seguinte.
    await new Promise((r) => setTimeout(r, 900));
    const { data, error } = await supabase.from("settings").select("bg_tone").maybeSingle();
    if (error || data?.bg_tone !== cor) setAviso({ tipo: "erro", texto: "Não consegui guardar a cor. Tente de novo." });
    else setAviso({ tipo: "ok", texto: "Cor guardada. Ela continua assim até você trocar." });
  }

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
    <CollapsibleBox title="Cor do fundo" icon={<PaletteIcon />} resumo="Tom e intensidade do degradê, claro e escuro">
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
        <label className={"note-chip" + (personalizada || rascunho !== null ? " active" : "")}>
          <span
            className="fundo-amostra"
            style={{ background: rascunho ?? (personalizada ? tomAtual : "linear-gradient(135deg,#f66,#6cf,#6f9)") }}
          />
          Personalizada
          <input
            type="color"
            className="fundo-seletor"
            value={rascunho ?? (personalizada ? tomAtual : "#4A47D5")}
            onChange={(e) => {
              setAviso(null);
              setRascunho(e.target.value);
            }}
          />
        </label>
      </div>

      {rascunho !== null && (
        <div className="fundo-salvar">
          <span className="fundo-amostra" style={{ background: rascunho }} />
          <span className="settings-toggle-hint">Pré-visualização. Só vale depois de salvar.</span>
          <button type="button" className="btn btn-ghost" onClick={() => setRascunho(null)}>
            Descartar
          </button>
          <button type="button" className="btn btn-accent" onClick={salvarCor}>
            Salvar cor
          </button>
        </div>
      )}
      {aviso && <div className={"fundo-aviso " + aviso.tipo}>{aviso.texto}</div>}

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

/** Humor: as 6 carinhas são fixas (alimentam o gráfico e a média do Dashboard); as emoções são dele. */
function HumorConfig() {
  const { board } = useBoardCtx();
  const [nova, setNova] = useState("");
  const opcoes = board.state.settings.dayOptions;
  const emocoes = emocoesEmUso(opcoes);
  const personalizada = !!opcoes?.emotions;

  function gravar(lista: Emocao[] | null) {
    board.updateSettings({ dayOptions: { emotions: lista, waterSteps: opcoes?.waterSteps ?? null } });
  }
  function adicionar() {
    const label = nova.trim();
    const v = valorDaEmocao(label);
    if (!label || !v) return;
    if (emocoes.some((e) => e.v === v)) {
      setNova("");
      return;
    }
    gravar([...emocoes, { v, label }]);
    setNova("");
  }

  return (
    <>
      <div className="settings-toggle-hint" style={{ marginBottom: 8 }}>
        As carinhas (Péssimo, Ruim, Neutro, Bom, Ótimo e Doente) são fixas. As emoções que aparecem embaixo delas são suas:
        cadastre e apague aqui. Na tela principal só se escolhe.
      </div>
      <div className="cfg-chips">
        {emocoes.map((e) => (
          <span className="cfg-chip" key={e.v}>
            {e.label}
            <button
              type="button"
              aria-label={`Remover ${e.label}`}
              onClick={() => gravar(emocoes.filter((x) => x.v !== e.v))}
            >
              ×
            </button>
          </span>
        ))}
        {emocoes.length === 0 && <span className="settings-toggle-hint">Nenhuma emoção. Cadastre abaixo.</span>}
      </div>
      <div className="note-options-add" style={{ marginTop: 10 }}>
        <input
          type="text"
          placeholder="Nova emoção (ex.: Grato)"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
        />
        <button type="button" className="btn btn-accent" onClick={adicionar}>
          Adicionar
        </button>
      </div>
      {personalizada && (
        <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => gravar(null)}>
          Voltar às emoções de fábrica
        </button>
      )}
    </>
  );
}

/** Água: meta do dia, botões rápidos de adicionar e o texto de estratégias. */
function AguaConfig() {
  const { board } = useBoardCtx();
  const [metaInput, setMetaInput] = useState<string | null>(null);
  const [passoInput, setPassoInput] = useState("");
  const [estrategias, setEstrategias] = useState<string | null>(null);
  const opcoes = board.state.settings.dayOptions;
  const passos = passosDeAgua(opcoes);

  function gravarPassos(lista: number[] | null) {
    board.updateSettings({ dayOptions: { emotions: opcoes?.emotions ?? null, waterSteps: lista } });
  }
  function adicionarPasso() {
    const ml = parseInt(passoInput, 10);
    if (isNaN(ml) || ml <= 0 || ml > 5000 || passos.includes(ml)) {
      setPassoInput("");
      return;
    }
    gravarPassos([...passos, ml].sort((a, b) => a - b));
    setPassoInput("");
  }

  return (
    <>
      <div className="settings-row-standalone" style={{ marginTop: 0 }}>
        <span className="settings-label">Meta diária de água (ml)</span>
        <input
          type="number"
          min={0}
          step={100}
          className="budget-input"
          value={metaInput ?? board.state.settings.waterGoalMl}
          onChange={(e) => setMetaInput(e.target.value)}
          onBlur={() => {
            if (metaInput === null) return;
            const v = parseInt(metaInput, 10);
            if (!isNaN(v) && v >= 0) board.updateSettings({ waterGoalMl: v });
            setMetaInput(null);
          }}
        />
      </div>
      <div className="settings-subblock">
        <span className="settings-label">Botões rápidos</span>
        <span className="settings-toggle-hint">Quanto cada botão soma quando você bebe água na tela principal.</span>
        <div className="cfg-chips">
          {passos.map((ml) => (
            <span className="cfg-chip" key={ml}>
              +{ml} ml
              <button type="button" aria-label={`Remover +${ml} ml`} onClick={() => gravarPassos(passos.filter((x) => x !== ml))}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="note-options-add">
          <input
            type="number"
            min={50}
            step={50}
            placeholder="Novo botão, em ml (ex.: 300)"
            value={passoInput}
            onChange={(e) => setPassoInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionarPasso()}
          />
          <button type="button" className="btn btn-accent" onClick={adicionarPasso}>
            Adicionar
          </button>
        </div>
        {opcoes?.waterSteps && (
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => gravarPassos(null)}>
            Voltar aos botões de fábrica
          </button>
        )}
      </div>
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
          value={estrategias ?? board.state.settings.waterStrategies ?? ""}
          onChange={(e) => setEstrategias(e.target.value)}
          onBlur={() => {
            if (estrategias === null) return;
            board.updateSettings({ waterStrategies: estrategias || null });
            setEstrategias(null);
          }}
          rows={3}
        />
      </div>
    </>
  );
}

function HorasConfig() {
  const { board } = useBoardCtx();
  const [budgetInput, setBudgetInput] = useState<string | null>(null);
  return (
    <div className="settings-row-standalone" style={{ marginTop: 0 }}>
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
  );
}

/**
 * Um bloco por painel da tela principal. Aqui se cadastra e se liga ou desliga: a tela principal
 * só preenche. Desligado, o painel some da tela do dia e do Dashboard e os dados ficam guardados.
 */
function PaineisDoMenu() {
  const { board } = useBoardCtx();
  const flags = board.state.settings.featureFlags;
  const modoDono = flags.modo_dono === true;
  return (
    <>
      {GRUPOS_DO_MENU.map((g) => {
        const itens = g.itens.filter((i) => i.modo !== "day" && (!i.somenteDono || modoDono));
        if (itens.length === 0) return null;
        const ligados = itens.filter((i) => menuLigado(flags, i.modo)).length;
        // A chave do grupo liga ou desliga todos os painéis dele de uma vez; cada um continua com a sua chave por dentro.
        const ligarTodos = (v: boolean) => {
          const novos = { ...flags };
          for (const i of itens) novos["menu_" + i.modo] = v;
          board.updateSettings({ featureFlags: novos });
        };
        return (
          <CollapsibleBox
            key={g.titulo}
            title={g.titulo}
            resumo={`${ligados} de ${itens.length} no menu`}
            ligado={ligados > 0}
            onLigar={ligarTodos}
            textoLiga={["No menu", "Fora do menu"]}
          >
            <div className="settings-rows">
              {itens.map((i) => (
                <div className="settings-toggle-row" key={i.modo}>
                  <span>
                    <span className="settings-label">{i.rotulo}</span>
                  </span>
                  <ToggleSwitch
                    checked={menuLigado(flags, i.modo)}
                    ariaLabel={"Mostrar " + i.rotulo + " no menu"}
                    onChange={(v) => board.updateSettings({ featureFlags: { ...flags, ["menu_" + i.modo]: v } })}
                  />
                </div>
              ))}
            </div>
          </CollapsibleBox>
        );
      })}
    </>
  );
}

function PaineisDaTela() {
  const { board } = useBoardCtx();
  const flags = board.state.settings.featureFlags;
  const ligado = (k: string) => isFeatureEnabled(flags, k);
  const ligar = (k: string) => (v: boolean) => board.updateSettings({ featureFlags: { ...flags, [k]: v } });
  const opcoes = board.state.settings.dayOptions;
  const nHabitos = board.state.habits.length;
  const nDiaADia = board.state.fixedBlocks.length;
  const texto = (t: string) => <div className="settings-toggle-hint">{t}</div>;

  return (
    <>
      <CollapsibleBox
        title="Humor"
        icon={<MoodFaceIcon value={4} size={15} />}
        resumo={`6 carinhas · ${emocoesEmUso(opcoes).length} emoções`}
        ligado={ligado("mood")}
        onLigar={ligar("mood")}
      >
        <HumorConfig />
      </CollapsibleBox>
      <CollapsibleBox
        title="Água"
        icon={<WaterDropIcon />}
        resumo={`Meta de ${board.state.settings.waterGoalMl} ml · ${passosDeAgua(opcoes).length} botões rápidos`}
        ligado={ligado("water")}
        onLigar={ligar("water")}
      >
        <AguaConfig />
      </CollapsibleBox>
      <CollapsibleBox title="Sono" icon={<MoonIcon />} resumo="Hora de dormir e de acordar, com a dica" ligado={ligado("sleep")} onLigar={ligar("sleep")}>
        {texto("Na tela principal você preenche a hora em que dormiu e a hora em que acordou. O FARO calcula as horas de sono e a dica.")}
      </CollapsibleBox>
      <CollapsibleBox title="Fidelidade à dieta" icon={<MealIcon />} resumo="Percentual do dia" ligado={ligado("diet")} onLigar={ligar("diet")}>
        {texto("Na tela principal você preenche o percentual do dia. As refeições e o plano ficam na tela Dieta.")}
      </CollapsibleBox>
      <CollapsibleBox
        title="Hábitos"
        icon={<ChecklistIcon />}
        resumo={`${nHabitos} ${nHabitos === 1 ? "hábito cadastrado" : "hábitos cadastrados"}`}
        ligado={ligado("panel_habitos")}
        onLigar={ligar("panel_habitos")}
      >
        {texto("Os hábitos aparecem na grade da semana, com cronômetro. Cadastre, edite e apague aqui.")}
        <RecurringManager kind="habit" />
      </CollapsibleBox>
      <CollapsibleBox
        title="Dia a Dia"
        icon={<ClockIcon />}
        resumo={`${nDiaADia} ${nDiaADia === 1 ? "item cadastrado" : "itens cadastrados"}`}
        ligado={ligado("panel_diadia")}
        onLigar={ligar("panel_diadia")}
      >
        {texto("Coisas que ocupam tempo todo dia (almoço, deslocamento, academia). Cadastre, edite e apague aqui.")}
        <RecurringManager kind="block" />
      </CollapsibleBox>
      <CollapsibleBox
        title="Horas"
        icon={<ClockIcon />}
        resumo={`Teto de ${board.state.settings.dailyBudgetHours} h por dia`}
        ligado={ligado("panel_horas")}
        onLigar={ligar("panel_horas")}
      >
        <HorasConfig />
      </CollapsibleBox>
      <CollapsibleBox title="Feriados" icon={<CalendarCheckIcon />} resumo="Feriados e pontos facultativos do Brasil" ligado={ligado("feriados")} onLigar={ligar("feriados")}>
        {texto("Mostra os feriados e pontos facultativos nacionais no Calendário, na Semana e embaixo da saudação, e avisa no domingo à noite quando a semana seguinte tem feriado. Feriados de estado e de cidade não entram.")}
      </CollapsibleBox>
      <CollapsibleBox title="Agenda" icon={<WeekIcon />} resumo="Compromissos e lembretes do dia" ligado={ligado("panel_agenda")} onLigar={ligar("panel_agenda")}>
        {texto("Mostra os compromissos com horário e os lembretes do dia escolhido. Nada para cadastrar aqui: vem das tarefas e dos lembretes.")}
      </CollapsibleBox>
      <CollapsibleBox title="Seu dia" icon={<HomeIcon />} resumo="Anel de tarefas concluídas" ligado={ligado("panel_resumo")} onLigar={ligar("panel_resumo")}>
        {texto("O anel com quantas tarefas do dia já foram concluídas.")}
      </CollapsibleBox>
      <CollapsibleBox title="Sem data" icon={<WarningIcon />} resumo="Lista recolhida embaixo das tarefas" ligado={ligado("panel_semdata")} onLigar={ligar("panel_semdata")}>
        {texto("As tarefas que ainda esperam uma data.")}
      </CollapsibleBox>
    </>
  );
}

// A cor de cada grupo é suave e só organiza (ponto no título, filete e ícone dos blocos). Mesma ideia do menu do app financeiro.
const GRUPOS_DE_CONFIGURACAO = [
  { id: "avisos", titulo: "Assistente e avisos", sub: "Quando o FARO avisa e quanto custa", cor: "#3E8E8A" },
  { id: "conexoes", titulo: "Conexões", sub: "O FARO falando com outras ferramentas", cor: "#4A47D5" },
  { id: "paineis", titulo: "Painéis da tela principal", sub: "Cada painel tem a sua configuração. Aqui você cadastra e liga ou desliga; na tela principal só se preenche.", cor: "#C28A1E" },
  { id: "menu", titulo: "Painéis do menu", sub: "Escolha o que aparece no menu lateral. Desligado, some do menu; o que você escreveu continua guardado.", cor: "#C28A1E" },
  { id: "tarefas", titulo: "Tarefas", sub: "Como as tarefas são organizadas", cor: "#B65C8B" },
  { id: "aparencia", titulo: "Aparência", sub: "Como o app aparece neste aparelho", cor: "#B65C8B" },
  { id: "dados", titulo: "Dados e backup", sub: "Cópias de segurança do que você escreveu", cor: "#6E6E78" },
  { id: "ajuda", titulo: "Canal de feedback", sub: "Conte um problema, uma ideia, uma dúvida ou um elogio para quem está construindo o FARO", cor: "#5B9BD0" },
] as const;

function GrupoDeConfiguracao({ id, children }: { id: (typeof GRUPOS_DE_CONFIGURACAO)[number]["id"]; children: ReactNode }) {
  const g = GRUPOS_DE_CONFIGURACAO.find((x) => x.id === id)!;
  return (
    <section className="cfg-grupo" id={"cfg-" + id} style={{ "--k": g.cor } as React.CSSProperties}>
      <div className="cfg-grupo-cab">
        <h2>{g.titulo}</h2>
        <span>{g.sub}</span>
      </div>
      {children}
    </section>
  );
}

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  // Conta do dono do FARO (marcada no banco). Só ela vê o que é particular dele: backup no Mac Mini e conector da IA dele.
  const modoDono = board.state.settings.featureFlags.modo_dono === true;
  const [newStatusLabel, setNewStatusLabel] = useState("");

  const tagColors = board.state.settings.tagColors;


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
        <TutorialLink secao="configuracoes" />
      </div>

      {/* Trilho de grupos à esquerda e, ao lado, os blocos de cada grupo (pedido de 22/10:
          blocos que se abrem para configurar). Os blocos são os mesmos de antes, só reagrupados. */}
      <div className="cfg-pagina">
        <nav className="cfg-trilho" aria-label="Grupos de configurações">
          {GRUPOS_DE_CONFIGURACAO.map((g) => (
            <button
              key={g.id}
              type="button"
              className="cfg-trilho-item"
              onClick={() => document.getElementById("cfg-" + g.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {g.titulo}
            </button>
          ))}
        </nav>
        <div className="cfg-conteudo">
          <GrupoDeConfiguracao id="avisos">
            <PushNotificationsBox />
            <WhatsAppCostBox />
            {modoDono && <CreditosDoZapBox />}
            <IaCostBox />
          </GrupoDeConfiguracao>

          <GrupoDeConfiguracao id="conexoes">
            <GoogleAgendaBox />
            <ConectorFaroBox />
          </GrupoDeConfiguracao>

          <GrupoDeConfiguracao id="paineis">
            <PaineisDaTela />
          </GrupoDeConfiguracao>

          <GrupoDeConfiguracao id="menu">
            <PaineisDoMenu />
          </GrupoDeConfiguracao>

          <GrupoDeConfiguracao id="tarefas">
            <CollapsibleBox title="Tags da tarefa" icon={<TagIcon />} resumo="Cor e força de cada tag">
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

            <CollapsibleBox title="Status de tarefa" icon={<FlagIcon color="currentColor" />} resumo={statuses.map((x) => x.label).join(", ")}>
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
          </GrupoDeConfiguracao>

          <GrupoDeConfiguracao id="aparencia">
            <EstiloVisualBox />
            <CorDoFundoBox />
          </GrupoDeConfiguracao>

          <GrupoDeConfiguracao id="dados">
            {/* Bloco só do Leandro: segurança dele, não é função de cliente. Fica
                separado dos backups manuais (que servem a qualquer usuário) para
                ele saber o que é o quê. */}
            {modoDono && (
              <div className="settings-particular">
                <div className="settings-particular-titulo">
                  <span className="settings-particular-selo">Particular do dono</span>
                  Segurança minha. Não vai para os clientes.
                </div>
                <BackupAutomaticoBox />
                <RestauradorBox />
              </div>
            )}

            <div className="settings-particular-titulo settings-particular-titulo-geral">
              Backups manuais (valem para qualquer usuário)
            </div>
            <BackupDeAprendizadoBox />

            <BackupBox />
          </GrupoDeConfiguracao>

          <GrupoDeConfiguracao id="ajuda">
            <FeedbackBox />
          </GrupoDeConfiguracao>
        </div>
      </div>
    </div>
  );
}
