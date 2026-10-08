"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useBoardCtx } from "./board-context";
import { MicIcon, MoodFaceIcon, SendIcon } from "./icons";
import { MOODS } from "@/lib/mood";
import { avisoDaVez, chaveDosAvisos, lerHistorico, type AcaoDoBotao, type AvisoDoFaro } from "@/lib/ia/avisos";
import { todayISO } from "@/lib/date-utils";
import { useDictation } from "@/lib/board/use-dictation";
import { resumoDoDia } from "@/lib/ia/resumo-do-dia";
import { descreverAcao, type AcaoProposta } from "@/lib/ia/ferramentas";
import { executarAcao } from "@/lib/ia/executar";
import type { EventoDaConversa } from "@/lib/ia/servidor";

function greetingMessage(mood: number | null | undefined): string {
  if (mood === 0) return "Melhoras, Leandro! Espero que fique bem logo.";
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia, Leandro!";
  if (hour < 18) return "Boa tarde, Leandro!";
  return "Boa noite, Leandro!";
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

// O que a IA vê da conversa: o texto mais o desfecho de cada ação, para ela saber
// o que de fato foi gravado e o que ele recusou.
function paraHistorico(f: Fala): { role: "user" | "assistant"; content: string } {
  const desfechos = (f.cartoes ?? []).map((c) => {
    const quando =
      c.estado === "feito" ? "FEITO" : c.estado === "cancelado" ? "CANCELADO pelo Leandro" : c.estado === "erro" ? `NÃO GRAVOU (${c.msg ?? "erro"})` : "aguardando confirmação";
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

export function FaroMascot() {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time greeting on first load of the day
      setOpen(true);
      localStorage.setItem(key, "1");
    }
  }, [board.loading, today]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [falas, open]);

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
      setOpen(true);
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
      const r = await fetch("/api/ia/conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico, resumo: resumoDoDia(board.state, today) }),
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
        updateDailyLog: board.updateDailyLog,
        logDeHoje: board.state.dailyLogs[today],
        studyPlans: board.state.studyPlans,
        updateStudyPlan: board.updateStudyPlan,
        generateStudySessions: board.generateStudySessions,
      },
      today
    );
    mudarCartao(indiceFala, cartao.id, { estado: r.ok ? "feito" : "erro", msg: r.mensagem });
  }

  return (
    <div className="faro-mascot">
      {open && (
        <div className="faro-bubble faro-bubble-chat">
          <button className="faro-bubble-close" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
            ×
          </button>
          {aviso ? (
            <div className="faro-aviso">
              <div className="faro-bubble-text">{aviso.texto}</div>
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
            <div className="faro-bubble-text">
              {avisoFeito ?? `${greetingMessage(mood)} ${falas.length === 0 ? "O que você precisa?" : ""}`}
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
                  {f.content || (!f.cartoes?.length && pensando && i === falas.length - 1 ? "…" : "")}
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
                <span>{ditado.listening ? "Ouvindo… toque para enviar" : pensando ? "Pensando…" : "Toque e fale"}</span>
              </button>
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
        {ditado.supported && (
          <button
            type="button"
            className={"faro-mic-flutuante" + (ditado.listening ? " ouvindo" : "")}
            aria-label="Falar com o FARO"
            title="Toque e fale"
            onClick={() => {
              setAviso(null);
              setOpen(true);
              ditado.toggle();
            }}
          >
            <MicIcon />
          </button>
        )}
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
