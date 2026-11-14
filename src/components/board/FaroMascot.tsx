"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useBoardCtx } from "./board-context";
import { ClockIcon, MicIcon, MoodFaceIcon, SendIcon } from "./icons";
import { horaDe, lerConversas, limparHistorico, rotuloDoDia, salvarConversa, type ConversaSalva } from "@/lib/ia/historico";
import { MOODS } from "@/lib/mood";
import { avisoDaVez, chaveDosAvisos, lerHistorico, type AcaoDoBotao, type AvisoDoFaro } from "@/lib/ia/avisos";
import { todayISO } from "@/lib/date-utils";
import { useDictation } from "@/lib/board/use-dictation";
import { resumoDoDia } from "@/lib/ia/resumo-do-dia";
import { descreverAcao, type AcaoProposta } from "@/lib/ia/ferramentas";
import { executarAcao } from "@/lib/ia/executar";
import { resumoDeFeedbacks, type FeedbackDoDono } from "@/lib/ia/feedbacks";
import type { EventoDaConversa } from "@/lib/ia/servidor";

function greetingMessage(mood: number | null | undefined, nome?: string | null): string {
  const quem = nome?.trim() ? `, ${nome.trim()}` : "";
  if (mood === 0) return `Melhoras${quem}! Espero que fique bem logo.`;
  const hour = new Date().getHours();
  if (hour < 12) return `Bom dia${quem}!`;
  if (hour < 18) return `Boa tarde${quem}!`;
  return `Boa noite${quem}!`;
}

type Cartao = {
  id: string;
  acao: AcaoProposta;
  estado: "pendente" | "feito" | "cancelado" | "erro";
  msg?: string;
};
type Fala = { role: "user" | "assistant"; content: string; cartoes?: Cartao[] };

// Atalhos de um toque: o que ele mais vai querer pedir, sem digitar.
const ATALHOS = ["O que estou esquecendo?", "Como foi minha semana?", "Por onde começo?"];

// Negrito simples: o que está entre ** vira destaque. É o único formato que a tela aceita (sem biblioteca de markdown).
function comNegrito(texto: string) {
  return texto.split("**").map((parte, i) => (i % 2 === 1 ? <strong key={i}>{parte}</strong> : parte));
}

// O que a IA vê da conversa: o texto mais o desfecho de cada ação, para ela saber
// o que de fato foi gravado e o que ele recusou.
function paraHistorico(f: Fala): { role: "user" | "assistant"; content: string } {
  const desfechos = (f.cartoes ?? []).map((c) => {
    const quando =
      c.estado === "feito" ? "FEITO" : c.estado === "cancelado" ? "CANCELADO pelo usuário" : c.estado === "erro" ? `NÃO GRAVOU (${c.msg ?? "erro"})` : "aguardando confirmação";
    return `[Ação proposta: ${descreverAcao(c.acao)} → ${quando}]`;
  });
  return { role: f.role, content: [f.content, ...desfechos].filter(Boolean).join("\n") };
}

// O que mostrar quando a rota devolve erro. O texto é para ele, não para o log.
function textoDoErro(status: number, erro: string | undefined, gasto?: number, teto?: number): string {
  if (erro === "sem_chave") return "A IA ainda não está ligada neste app (falta a chave na Vercel).";
  if (erro === "teto") {
    const reais = (v?: number) => (v ?? 0).toFixed(2).replace(".", ",");
    return `Chegamos no teto de gasto do mês (R$ ${reais(gasto)} de R$ ${reais(teto)}). Dá para aumentar em Configurações → Custo da IA.`;
  }
  if (erro === "chave_admin") return "A chave guardada na Vercel é de administração. Crie uma chave de API comum no console da Anthropic (API Keys) e cole no lugar.";
  if (erro === "chave_malformada") return "A chave guardada na Vercel não parece uma chave da Anthropic (ela começa com sk-ant-). Cole de novo, só a chave, sem aspas nem espaços.";
  if (erro === "chave_invalida") return "A chave da IA não foi aceita pela Anthropic. Confira a chave na Vercel.";
  if (erro === "limite_da_api") return "A IA está com muito uso agora. Tente de novo em instantes.";
  if (status === 401) return "Sua sessão expirou. Entre de novo no FARO.";
  return "Não consegui falar com a IA agora. Tente de novo daqui a pouco.";
}

/** Tela de celular: a janela do FARO não abre sozinha aqui (cobre a tela inicial). */
function ehCelular(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
}

export function FaroMascot({ comDock = false }: { comDock?: boolean }) {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  // Histórico: lista das conversas guardadas neste aparelho; `aberta` = a que está sendo lida (null = a lista).
  const [verHistorico, setVerHistorico] = useState(false);
  const [conversas, setConversas] = useState<ConversaSalva[]>([]);
  const [aberta, setAberta] = useState<ConversaSalva | null>(null);
  const idDaConversa = useRef(`c${Date.now()}`);
  const inicioDaConversa = useRef(Date.now());
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const [aviso, setAviso] = useState<AvisoDoFaro | null>(null);
  const [avisoFeito, setAvisoFeito] = useState<string | null>(null);
  // O verificador de avisos roda num relógio e precisa enxergar o estado de agora, não o da hora em que nasceu.
  const vistoRef = useRef({ state: board.state, conversando: false });
  const today = todayISO();
  const mood = board.state.dailyLogs[today]?.mood;

  // Toca, fala uma frase e ela já vai: a confirmação da AÇÃO é o cartão, não o envio.
  // Fala e, 3 segundos depois de parar, já vai (ou toque de novo no microfone para enviar na hora).
  const ditado = useDictation({ oneShot: true, silenceMs: 3000, onText: () => {}, onDone: (t) => void enviar(t) });

  useEffect(() => {
    if (board.loading) return;
    const key = `faro-greeted-${today}`;
    if (!localStorage.getItem(key)) {
      // No celular a janela cobre a tela: ele fica só como o cachorrinho e abre quando a pessoa toca.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time greeting on first load of the day
      if (!ehCelular()) setOpen(true);
      localStorage.setItem(key, "1");
    }
  }, [board.loading, today]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [falas, open]);

  // Guarda a conversa no histórico quando uma resposta termina (não a cada pedaço do texto que chega).
  useEffect(() => {
    if (pensando || !falas.length) return;
    salvarConversa({
      id: idDaConversa.current,
      inicio: inicioDaConversa.current,
      fim: Date.now(),
      falas: falas.map((f) => {
        const feitos = (f.cartoes ?? []).map((c) => `[${descreverAcao(c.acao)}: ${c.estado === "feito" ? "feito" : c.estado === "cancelado" ? "cancelado" : c.estado === "erro" ? "não gravou" : "não confirmado"}]`);
        return { role: f.role, content: [f.content, ...feitos].filter(Boolean).join("\n") };
      }),
    });
  }, [falas, pensando]);

  function abrirHistorico() {
    setConversas(lerConversas());
    setAberta(null);
    setVerHistorico((v) => !v);
  }

  // O botão FARO do menu inferior do celular abre a janela e já começa a ouvir (se o aparelho tem ditado).
  const ditadoRef = useRef(ditado);
  useEffect(() => {
    ditadoRef.current = ditado;
  });
  useEffect(() => {
    function abrirDoMenu() {
      setOpen(true);
      setTimeout(() => {
        const d = ditadoRef.current;
        if (d.supported && !d.listening) d.toggle();
      }, 250);
    }
    window.addEventListener("faro:falar", abrirDoMenu);
    return () => window.removeEventListener("faro:falar", abrirDoMenu);
  }, []);

  useEffect(() => {
    vistoRef.current = { state: board.state, conversando: falas.length > 0 || pensando };
  }, [board.state, falas.length, pensando]);

  // O FARO te puxa sozinho no meio do dia (regras fixas em lib/ia/avisos.ts). Só com a
  // tela visível, sem conversa em andamento, e no máximo 2 por dia.
  useEffect(() => {
    if (board.loading) return;
    function verificar() {
      if (document.visibilityState !== "visible" || vistoRef.current.conversando) return;
      const hoje = todayISO();
      const chave = chaveDosAvisos(hoje);
      let historico = lerHistorico(null);
      try {
        historico = lerHistorico(localStorage.getItem(chave));
      } catch {
        return; // sem armazenamento não dá para limitar a 2 por dia: melhor não puxar
      }
      const a = avisoDaVez(vistoRef.current.state, new Date(), hoje, historico);
      if (!a) return;
      try {
        localStorage.setItem(chave, JSON.stringify({ ids: [...historico.ids, a.id], ultimoEm: Date.now() }));
      } catch {
        return;
      }
      setAvisoFeito(null);
      setAviso(a);
      if (!ehCelular()) setOpen(true);
    }
    const primeira = setTimeout(verificar, 30_000);
    const relogio = setInterval(verificar, 60_000);
    return () => {
      clearTimeout(primeira);
      clearInterval(relogio);
    };
  }, [board.loading]);

  function tratarBotao(acao: AcaoDoBotao) {
    if (acao.tipo === "humor") {
      board.updateDailyLog(todayISO(), { mood: acao.nivel });
      setAviso(null);
      setAvisoFeito("Anotado, obrigado.");
    } else if (acao.tipo === "perguntar") {
      setAviso(null);
      if (acao.texto) void enviar(acao.texto);
      else if (ditado.supported) ditado.start();
    } else if (acao.tipo === "ver_registro") {
      setAviso(null);
      setOpen(false);
      document.querySelector(".daily-log-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setAviso(null);
    }
  }

  // Feedbacks recebidos: só a conta do dono lê, e só entram no resumo da conversa dela.
  const feedbacksRef = useRef<FeedbackDoDono[]>([]);
  const ehDono = board.state.settings.featureFlags.modo_dono === true;
  async function lerFeedbacks() {
    if (!ehDono) return;
    try {
      const r = await fetch("/api/feedback");
      const j = (await r.json()) as { ok?: boolean; feedbacks?: FeedbackDoDono[] };
      if (r.ok && j.ok && Array.isArray(j.feedbacks)) feedbacksRef.current = j.feedbacks;
    } catch {
      // Sem a lista, o assistente só não fala de feedbacks.
    }
  }
  async function marcarFeedback(id: string, resolvido: boolean): Promise<boolean> {
    try {
      const r = await fetch("/api/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, lido: resolvido }) });
      if (!r.ok) return false;
      feedbacksRef.current = feedbacksRef.current.map((f) => (f.id === id ? { ...f, lido_em: resolvido ? new Date().toISOString() : null } : f));
      return true;
    } catch {
      return false;
    }
  }

  async function enviar(textoPronto?: string) {
    const pergunta = (textoPronto ?? texto).trim();
    if (!pergunta || pensando) return;
    const historico = [...falas.map(paraHistorico), { role: "user" as const, content: pergunta }];
    setFalas([...falas, { role: "user", content: pergunta }, { role: "assistant", content: "" }]);
    setTexto("");
    setPensando(true);
    const atualizarUltima = (mudar: (f: Fala) => Fala) =>
      setFalas((f) => [...f.slice(0, -1), mudar(f[f.length - 1])]);
    try {
      await lerFeedbacks();
      const r = await fetch("/api/ia/conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico, resumo: resumoDeFeedbacks(feedbacksRef.current).trimStart() + (feedbacksRef.current.some((f) => !f.lido_em) ? "\n\n" : "") + resumoDoDia(board.state, today) }),
      });
      if (!r.ok || !r.body) {
        const d = (await r.json().catch(() => ({}))) as { erro?: string; gasto?: number; teto?: number };
        atualizarUltima((f) => ({ ...f, content: textoDoErro(r.status, d.erro, d.gasto, d.teto) }));
        return;
      }
      const leitor = r.body.getReader();
      const decodificador = new TextDecoder();
      let resto = "";
      let veioAlgo = false;
      const tratarLinha = (linha: string) => {
        if (!linha.trim()) return;
        let ev: EventoDaConversa;
        try {
          ev = JSON.parse(linha) as EventoDaConversa;
        } catch {
          return;
        }
        veioAlgo = true;
        if (ev.t === "texto") atualizarUltima((f) => ({ ...f, content: f.content + ev.d }));
        else if (ev.t === "acao")
          atualizarUltima((f) => ({ ...f, cartoes: [...(f.cartoes ?? []), { id: ev.id, acao: ev.acao, estado: "pendente" }] }));
      };
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        resto += decodificador.decode(value, { stream: true });
        const linhas = resto.split("\n");
        resto = linhas.pop() ?? "";
        linhas.forEach(tratarLinha);
      }
      tratarLinha(resto);
      if (!veioAlgo) atualizarUltima((f) => ({ ...f, content: "Não veio resposta. Tente de novo." }));
    } catch {
      atualizarUltima((f) => ({ ...f, content: f.content || "A conversa foi interrompida. Tente de novo." }));
    } finally {
      setPensando(false);
    }
  }

  function mudarCartao(indiceFala: number, id: string, mudar: Partial<Cartao>) {
    setFalas((fs) =>
      fs.map((f, i) =>
        i === indiceFala ? { ...f, cartoes: f.cartoes?.map((c) => (c.id === id ? { ...c, ...mudar } : c)) } : f
      )
    );
  }

  async function confirmar(indiceFala: number, cartao: Cartao) {
    mudarCartao(indiceFala, cartao.id, { estado: "feito", msg: "Gravando…" });
    const r = await executarAcao(
      cartao.acao,
      {
        checklists: board.state.checklists,
        addReminder: board.addReminder,
        addTask: board.addTask,
        updateChecklist: board.updateChecklist,
        tasks: board.state.tasks,
        taskStatuses: board.state.taskStatuses,
        setTaskStatus: board.setTaskStatus,
        addMeeting: board.addMeeting,
        setTaskReminder: board.setTaskReminder,
        updateTaskNote: board.updateTaskNote,
        birthdays: board.state.birthdays,
        addBirthday: board.addBirthday,
        updateBirthday: board.updateBirthday,
        updateDailyLog: board.updateDailyLog,
        logDeHoje: board.state.dailyLogs[today],
        studyPlans: board.state.studyPlans,
        updateStudyPlan: board.updateStudyPlan,
        generateStudySessions: board.generateStudySessions,
        pantryItems: board.state.pantryItems,
        addPantryItem: board.addPantryItem,
        addQuickNote: board.addQuickNote,
        updatePantryItem: board.updatePantryItem,
        reminders: board.state.reminders,
        completeReminder: board.completeReminder,
        addMetanoiaFrase: board.addMetanoiaFrase,
        feedbacks: feedbacksRef.current,
        marcarFeedback,
        maintenanceAssets: board.state.maintenanceAssets,
        maintenanceItems: board.state.maintenanceItems,
        addMaintenanceAsset: board.addMaintenanceAsset,
        addMaintenanceItem: board.addMaintenanceItem,
        registerMaintenanceService: board.registerMaintenanceService,
      },
      today
    );
    mudarCartao(indiceFala, cartao.id, { estado: r.ok ? "feito" : "erro", msg: r.mensagem });
  }

  return (
    <div className={"faro-mascot" + (comDock ? " com-dock" : "")}>
      {open && (
        <div className={"faro-bubble faro-bubble-chat" + (ampliado ? " faro-ampliado" : "") + (verHistorico ? " faro-em-historico" : "")}>
          <div className="faro-janela-cab">
            <b>FARO</b>
            <button
              className="faro-bubble-close faro-hist-btn"
              type="button"
              aria-label="Histórico de conversas"
              title="Histórico de conversas"
              onClick={abrirHistorico}
            >
              <ClockIcon />
            </button>
            <button
              className="faro-bubble-close faro-ampliar"
              type="button"
              aria-label={ampliado ? "Reduzir a janela" : "Ampliar a janela"}
              title={ampliado ? "Reduzir" : "Ampliar"}
              onClick={() => setAmpliado((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ampliado ? <path d="M14 10h6M14 10V4M10 14H4M10 14v6" /> : <path d="M15 3h6v6M9 21H3v-6" />}
              </svg>
            </button>
            <button className="faro-bubble-close" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          {verHistorico && (
            <div className="faro-hist">
              {aberta ? (
                <>
                  <button type="button" className="faro-hist-voltar" onClick={() => setAberta(null)}>
                    ‹ Voltar às conversas
                  </button>
                  <div className="faro-hist-quando">
                    {rotuloDoDia(aberta.inicio)}, {horaDe(aberta.inicio)}
                  </div>
                  <div className="faro-chat-lista faro-hist-lista">
                    {aberta.falas.map((f, i) => (
                      <div key={i} className={"faro-fala " + (f.role === "user" ? "faro-fala-eu" : "faro-fala-faro")}>
                        {comNegrito(f.content)}
                      </div>
                    ))}
                  </div>
                </>
              ) : conversas.length === 0 ? (
                <div className="faro-bubble-hint">Ainda não há conversas guardadas. Elas ficam neste aparelho por 14 dias.</div>
              ) : (
                <>
                  <div className="faro-hist-lista">
                    {conversas.map((c, i) => {
                      const dia = rotuloDoDia(c.inicio);
                      const novoDia = i === 0 || rotuloDoDia(conversas[i - 1].inicio) !== dia;
                      const pedido = c.falas.find((f) => f.role === "user")?.content ?? "";
                      return (
                        <div key={c.id}>
                          {novoDia && <div className="faro-hist-dia">{dia}</div>}
                          <button type="button" className="faro-hist-item" onClick={() => setAberta(c)}>
                            <span className="faro-hist-hora">{horaDe(c.inicio)}</span>
                            <span className="faro-hist-pedido">{pedido.length > 90 ? pedido.slice(0, 87) + "…" : pedido}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="faro-hist-voltar"
                    onClick={() => {
                      limparHistorico();
                      setConversas([]);
                    }}
                  >
                    Apagar histórico deste aparelho
                  </button>
                </>
              )}
              <button type="button" className="faro-hist-voltar" onClick={() => setVerHistorico(false)}>
                Fechar histórico
              </button>
            </div>
          )}
          {verHistorico ? null : aviso ? (
            <div className="faro-aviso">
              <div className="faro-bubble-text faro-fala-abertura">{aviso.texto}</div>
              {aviso.escalaDeHumor && (
                <div className="faro-humor">
                  {MOODS.filter((m) => m.v >= 1).map((m) => (
                    <button
                      key={m.v}
                      type="button"
                      className="faro-humor-btn"
                      title={m.label}
                      aria-label={m.label}
                      onClick={() => tratarBotao({ tipo: "humor", nivel: m.v as 1 | 2 | 3 | 4 | 5 })}
                    >
                      <MoodFaceIcon value={m.v} size={22} />
                    </button>
                  ))}
                </div>
              )}
              <div className="faro-chips">
                {aviso.botoes.map((b) => (
                  <button key={b.rotulo} type="button" className="faro-chip" onClick={() => tratarBotao(b.acao)}>
                    {b.rotulo}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="faro-bubble-text faro-fala-abertura">
              {avisoFeito ?? `${greetingMessage(mood, board.state.settings.preferredName)} ${falas.length === 0 ? "O que você precisa?" : ""}`}
            </div>
          )}
          {falas.length === 0 && !aviso && (
            <div className="faro-chips">
              {ATALHOS.map((a) => (
                <button key={a} type="button" className="faro-chip" disabled={pensando} onClick={() => void enviar(a)}>
                  {a}
                </button>
              ))}
            </div>
          )}
          {falas.length > 0 && (
            <div className="faro-chat-lista">
              {falas.map((f, i) => (
                <div key={i} className={"faro-fala " + (f.role === "user" ? "faro-fala-eu" : "faro-fala-faro")}>
                  {f.content ? comNegrito(f.content) : !f.cartoes?.length && pensando && i === falas.length - 1 ? "…" : ""}
                  {f.cartoes?.map((c) => (
                    <div key={c.id} className={"faro-cartao faro-cartao-" + c.estado}>
                      <div className="faro-cartao-texto">{descreverAcao(c.acao)}</div>
                      {c.estado === "pendente" ? (
                        <div className="faro-cartao-acoes">
                          <button type="button" className="btn btn-accent" onClick={() => void confirmar(i, c)}>
                            Confirmar
                          </button>
                          <button type="button" className="btn btn-ghost" onClick={() => mudarCartao(i, c.id, { estado: "cancelado" })}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="faro-cartao-situacao">
                          {c.estado === "feito" && "✓ "}
                          {c.estado === "cancelado" ? "Cancelado" : c.msg}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              <div ref={fim} />
            </div>
          )}
          {ditado.supported && (
            <div className="faro-mic-zona">
              <button
                type="button"
                className={"faro-mic-grande" + (ditado.listening ? " ouvindo" : "")}
                aria-label={ditado.listening ? "Enviar agora" : "Falar com o FARO"}
                disabled={pensando}
                onClick={() => ditado.toggle()}
              >
                <MicIcon />
              </button>
              <div className="faro-mic-legenda">{ditado.listening ? "Ouvindo… toque de novo para enviar" : pensando ? "Pensando…" : "Toque e fale"}</div>
              {ditado.listening && (
                <div className="faro-ouvindo">{ditado.heard || "Pode falar. Envio automático 3 s depois que você parar."}</div>
              )}
            </div>
          )}
          <form
            className="faro-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <input
              type="text"
              className="faro-chat-input"
              placeholder="…ou escreva aqui"
              aria-label="Pergunte ao FARO"
              value={texto}
              maxLength={2000}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" className="faro-chat-enviar" aria-label="Enviar" disabled={pensando || !texto.trim()}>
              <SendIcon />
            </button>
          </form>
          {ditado.error && <div className="faro-bubble-hint">{ditado.error}</div>}
          <div className="faro-bubble-hint">Eu anoto lembretes, tarefas, gastos e humor, sempre pedindo seu OK antes de gravar.</div>
        </div>
      )}
      <div className="faro-avatar-linha">
        <button
          type="button"
          className="faro-avatar"
          aria-label="FARO"
          title="FARO"
          onClick={() => setOpen((v) => !v)}
        >
          <Image src="/faro-mascote.svg" alt="" width={74} height={68} priority className="faro-avatar-img" />
        </button>
      </div>
    </div>
  );
}
