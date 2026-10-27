"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { EyeOffIcon, HeartIcon } from "./icons";
import { todayISO } from "@/lib/date-utils";
import { creditoDaFrase, fraseEmDestaque } from "@/lib/metanoia";
import { useTemaDoCartao } from "./use-tema-metanoia";
import type { MetanoiaFrase, MetanoiaTipo } from "@/lib/types";

const TEXTO_NAO_LISTAR = "Não mostrar mais essa frase. Ela vai para Não listadas na Metanoia, de onde dá para voltar depois.";
const CHAVE_FECHADA = "faro-metanoia-fechada";

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
  const { board } = useBoardCtx();
  const f = fraseEmDestaque(board.state.metanoiaFrases, board.state.settings, todayISO(), new Date());
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

  // Não apaga: sai da fila e da lista e fica em "Não listadas", de onde dá para trazer de volta.
  function naoAparecerMais() {
    board.updateMetanoiaFrase(f!.id, { status: "arquivada" });
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
            title={TEXTO_NAO_LISTAR}
            aria-label={TEXTO_NAO_LISTAR}
            onClick={(e) => {
              e.stopPropagation();
              naoAparecerMais();
            }}
          >
            <EyeOffIcon />
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
        <button type="button" className="meta-cartao-discreto meta-cartao-ultimo" title={TEXTO_NAO_LISTAR} aria-label={TEXTO_NAO_LISTAR} onClick={naoAparecerMais}>
          <EyeOffIcon />
        </button>
      </div>
    </div>
  );
}
