"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useBoardCtx } from "./board-context";
import { SendIcon } from "./icons";
import { todayISO } from "@/lib/date-utils";
import { resumoDoDia } from "@/lib/ia/resumo-do-dia";

function greetingMessage(mood: number | null | undefined): string {
  if (mood === 0) return "Melhoras, Leandro! Espero que fique bem logo.";
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia, Leandro!";
  if (hour < 18) return "Boa tarde, Leandro!";
  return "Boa noite, Leandro!";
}

type Fala = { role: "user" | "assistant"; content: string };

// Atalhos de um toque: o que ele mais vai querer pedir, sem digitar.
const ATALHOS = ["O que estou esquecendo?", "Como foi minha semana?", "Por onde começo?"];

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
  const today = todayISO();
  const mood = board.state.dailyLogs[today]?.mood;

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

  async function enviar(textoPronto?: string) {
    const pergunta = (textoPronto ?? texto).trim();
    if (!pergunta || pensando) return;
    const historico: Fala[] = [...falas, { role: "user", content: pergunta }];
    setFalas([...historico, { role: "assistant", content: "" }]);
    setTexto("");
    setPensando(true);
    const responder = (conteudo: string) =>
      setFalas((f) => [...f.slice(0, -1), { role: "assistant", content: conteudo }]);
    try {
      const r = await fetch("/api/ia/conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico, resumo: resumoDoDia(board.state, today) }),
      });
      if (!r.ok || !r.body) {
        const d = (await r.json().catch(() => ({}))) as { erro?: string; gasto?: number; teto?: number };
        responder(textoDoErro(r.status, d.erro, d.gasto, d.teto));
        return;
      }
      const leitor = r.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        responder(acumulado);
      }
      if (!acumulado.trim()) responder("Não veio resposta. Tente de novo.");
    } catch {
      responder("A conversa foi interrompida. Tente de novo.");
    } finally {
      setPensando(false);
    }
  }

  return (
    <div className="faro-mascot">
      {open && (
        <div className="faro-bubble faro-bubble-chat">
          <button className="faro-bubble-close" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
            ×
          </button>
          <div className="faro-bubble-text">
            {greetingMessage(mood)} {falas.length === 0 && "O que você precisa?"}
          </div>
          {falas.length === 0 && (
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
                  {f.content || (pensando && i === falas.length - 1 ? "…" : "")}
                </div>
              ))}
              <div ref={fim} />
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
              placeholder="Pergunte algo sobre o seu dia…"
              aria-label="Pergunte ao FARO"
              value={texto}
              maxLength={2000}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" className="faro-chat-enviar" aria-label="Enviar" disabled={pensando || !texto.trim()}>
              <SendIcon />
            </button>
          </form>
          <div className="faro-bubble-hint">Eu enxergo suas tarefas, lembretes, hábitos e os números do registro do dia. Remédios ficam de fora.</div>
        </div>
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
  );
}
