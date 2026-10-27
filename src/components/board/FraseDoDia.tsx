"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useBoardCtx } from "./board-context";
import { HeartIcon, TrashIcon } from "./icons";
import { todayISO } from "@/lib/date-utils";
import { creditoDaFrase, fraseDaVez, horariosDePerguntasEmUso, horariosEmUso } from "@/lib/metanoia";
import type { MetanoiaFrase, MetanoiaTema, MetanoiaTipo, Settings } from "@/lib/types";

const CHAVE_FECHADA = "faro-metanoia-fechada";

function temaDoApp(): "claro" | "escuro" {
  return document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
}

function inscreverTema(avisar: () => void) {
  const o = new MutationObserver(avisar);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}

/** "auto" segue o tema do app; o servidor não sabe qual é, então começa claro e acerta na hidratação. */
function useTemaDoCartao(tema: MetanoiaTema): "claro" | "escuro" {
  const doApp = useSyncExternalStore(inscreverTema, temaDoApp, () => "claro" as const);
  return tema === "auto" ? doApp : tema;
}

/**
 * O que está em destaque agora: o que o FARO mandou por último hoje (frase ou pergunta, nos horários que a pessoa
 * escolheu). Antes da primeira do dia, a primeira frase.
 */
function emDestaqueAgora(frases: MetanoiaFrase[], s: Settings): MetanoiaFrase | null {
  const hoje = todayISO();
  const agora = new Date();
  const min = agora.getHours() * 60 + agora.getMinutes();
  const emMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  let melhor: { quando: number; tipo: MetanoiaTipo; slot: number } = { quando: -1, tipo: "frase", slot: 0 };
  const grupos: [MetanoiaTipo, string[]][] = [
    ["frase", horariosEmUso(s.metanoiaVezes, s.metanoiaInicio, s.metanoiaFim)],
    ["pergunta", horariosDePerguntasEmUso(s.metanoiaPerguntasVezes, s.metanoiaPerguntasInicio, s.metanoiaPerguntasFim)],
  ];
  for (const [tipo, horarios] of grupos) {
    horarios.forEach((h, slot) => {
      const m = emMin(h);
      if (m <= min && m > melhor.quando) melhor = { quando: m, tipo, slot };
    });
  }
  return fraseDaVez(frases, hoje, melhor.slot, melhor.tipo) ?? fraseDaVez(frases, hoje, 0, "frase") ?? fraseDaVez(frases, hoje, 0, "pergunta");
}

function Texto({ f }: { f: MetanoiaFrase }) {
  return <>{f.tipo === "pergunta" ? f.texto : <>&ldquo;{f.texto}&rdquo;</>}</>;
}

function rotulo(tipo: MetanoiaTipo) {
  return tipo === "pergunta" ? "Metanoia · pergunta" : "Metanoia · hoje";
}

/**
 * Metanoia na tela inicial: um cartão só, logo abaixo da saudação (branco com texto preto ou preto com texto
 * branco, conforme a escolha em Metanoia → Aparência). O X fecha até a próxima frase. Quem chega pela notificação
 * (`?ver=metanoia`) vê a frase em tela cheia; tocar em qualquer lugar fecha e deixa o painel.
 */
export function FraseDoDia({ onAbrir, telaCheia = false, onFecharTelaCheia }: { onAbrir: () => void; telaCheia?: boolean; onFecharTelaCheia?: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const f = emDestaqueAgora(board.state.metanoiaFrases, board.state.settings);
  const tema = useTemaDoCartao(board.state.settings.metanoiaTema);
  const [fechada, setFechada] = useState<string | null>(null);

  useEffect(() => {
    // Lê do aparelho (sistema externo) uma vez, ao abrir.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
      setFechada(window.localStorage.getItem(CHAVE_FECHADA));
    } catch {}
  }, []);

  if (!f) return null;
  const credito = creditoDaFrase(f);

  function fechar() {
    setFechada(f!.id);
    try {
      window.localStorage.setItem(CHAVE_FECHADA, f!.id);
    } catch {}
  }

  function naoAparecerMais() {
    askConfirm(
      f!.tipo === "pergunta" ? "Tem certeza que quer excluir essa pergunta? Ela não aparece mais." : "Tem certeza que quer excluir essa frase? Ela não aparece mais.",
      () => board.updateMetanoiaFrase(f!.id, { status: "arquivada" })
    );
  }

  if (telaCheia) {
    return (
      <div className={"meta-cheia " + tema} role="dialog" aria-label="Metanoia" onClick={onFecharTelaCheia}>
        <div className="meta-cartao-rotulo">{rotulo(f.tipo)}</div>
        <p className="meta-cheia-texto">
          <Texto f={f} />
        </p>
        {credito && <div className="meta-cartao-credito">{credito}</div>}
        <div className="meta-cheia-base">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              board.updateMetanoiaFrase(f.id, { favorita: !f.favorita });
            }}
          >
            <HeartIcon filled={f.favorita} /> {f.favorita ? "Favorita" : "Favoritar"}
          </button>
          <button
            type="button"
            title="Não aparecer mais"
            aria-label="Não aparecer mais"
            onClick={(e) => {
              e.stopPropagation();
              naoAparecerMais();
            }}
          >
            <TrashIcon />
          </button>
          <span>Toque para fechar</span>
        </div>
      </div>
    );
  }

  if (fechada === f.id) return null;
  return (
    <div className={"meta-cartao " + tema}>
      <button type="button" className="meta-cartao-x" aria-label="Fechar até a próxima frase" onClick={fechar}>
        ×
      </button>
      <div className="meta-cartao-rotulo">{rotulo(f.tipo)}</div>
      <p className="meta-cartao-texto">
        <Texto f={f} />
      </p>
      {credito && <div className="meta-cartao-credito">{credito}</div>}
      <div className="meta-cartao-acoes">
        <button type="button" onClick={() => board.updateMetanoiaFrase(f.id, { favorita: !f.favorita })}>
          <HeartIcon filled={f.favorita} /> {f.favorita ? "Favorita" : "Favoritar"}
        </button>
        <button type="button" onClick={onAbrir}>
          Abrir
        </button>
        <button type="button" className="meta-cartao-discreto" title="Não aparecer mais" aria-label="Não aparecer mais" onClick={naoAparecerMais}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
