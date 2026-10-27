"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { EditIcon, EyeOffIcon, HeartIcon } from "./icons";
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
export function FraseDoDia({ onAbrir, onEditar, telaCheia = false, onFecharTelaCheia }: { onAbrir: (f: MetanoiaFrase) => void; onEditar: (f: MetanoiaFrase) => void; telaCheia?: boolean; onFecharTelaCheia?: () => void }) {
  const { board } = useBoardCtx();
  // Setinhas do cartão: andam na fila da Metanoia, só nesta tela (não mudam o que o FARO manda).
  const [passos, setPassos] = useState(0);
  // Favoritar muda a fila (a favorita entra duas vezes); a frase na tela fica onde está até a pessoa usar as setas.
  const [fixaId, setFixaId] = useState<string | null>(null);
  const natural = fraseEmDestaque(board.state.metanoiaFrases, board.state.settings, todayISO(), new Date(), passos);
  const fixa = fixaId ? board.state.metanoiaFrases.find((x) => x.id === fixaId && x.status === "aprovada") : undefined;
  const f = fixa ?? natural;
  const tema = useTemaDoCartao(board.state.settings.metanoiaTema);
  const [fechada, setFechada] = useState<string | null>(null);

  useEffect(() => {
    // Lê do aparelho (sistema externo) uma vez, ao abrir.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
      setFechada(window.localStorage.getItem(CHAVE_FECHADA));
    } catch {}
  }, []);

  if (!f || board.state.settings.featureFlags.menu_metanoia === false) return null;
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
              setFixaId(f.id);
              board.updateMetanoiaFrase(f.id, { favorita: !f.favorita });
            }}
            className={f.favorita ? "coracao-ativo" : ""}
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
      <div className="meta-cartao-nav">
        <button type="button" aria-label="Frase anterior" title="Anterior" onClick={() => { setFixaId(null); setPassos((p) => p - 1); }}>
          ‹
        </button>
        <button type="button" aria-label="Próxima frase" title="Próxima" onClick={() => { setFixaId(null); setPassos((p) => p + 1); }}>
          ›
        </button>
      </div>
      <button type="button" className="meta-cartao-x" aria-label="Fechar até a próxima frase" onClick={fechar}>
        ×
      </button>
      <div className="meta-cartao-rotulo">{rotulo(f.tipo)}</div>
      <p className="meta-cartao-texto">
        <Texto f={f} />
      </p>
      {credito && <div className="meta-cartao-credito">{credito}</div>}
      <div className="meta-cartao-acoes">
        <button
          type="button"
          className={f.favorita ? "coracao-ativo" : ""}
          onClick={() => {
            setFixaId(f.id);
            board.updateMetanoiaFrase(f.id, { favorita: !f.favorita });
          }}
        >
          <HeartIcon filled={f.favorita} /> {f.favorita ? "Favorita" : "Favoritar"}
        </button>
        <button type="button" onClick={() => onAbrir(f)}>
          Abrir
        </button>
        <button type="button" className="meta-cartao-discreto meta-cartao-ultimo" title="Editar esta frase" aria-label="Editar esta frase" onClick={() => onEditar(f)}>
          <EditIcon />
        </button>
        <button type="button" className="meta-cartao-discreto" title={TEXTO_NAO_LISTAR} aria-label={TEXTO_NAO_LISTAR} onClick={naoAparecerMais}>
          <EyeOffIcon />
        </button>
      </div>
    </div>
  );
}
