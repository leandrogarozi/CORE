"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "./icons";

/** Pede ao app para abrir Configurações > Conexões, já no cartão "Conecta com a sua IA". */
export function abrirConexaoDaIA() {
  window.dispatchEvent(new CustomEvent("faro:conectar-ia"));
}

/**
 * O cartão grande de apresentação do conector (Configurações > Conexões): diz em uma frase para que serve e que só vale
 * o que a pessoa aprovou. O passo a passo e o botão de criar o endereço continuam na caixa "Conector FARO", logo abaixo.
 */
export function ConectarIACartao() {
  return (
    <div className="ia-hero" id="cfg-conectar-ia">
      <div className="ia-hero-chips">
        <span>Claude</span>
      </div>
      <h2>
        Conecta com
        <br />a sua IA.
      </h2>
      <p>Ela lê só o que você aprovou. Você não precisa explicar quem você é toda vez.</p>
      <div className="ia-hero-selo">
        <span className="ia-hero-ok" aria-hidden="true">
          <CheckIcon />
        </span>
        <span>
          <b>Conhecendo você</b> · só vale o que você aprova
        </span>
      </div>
    </div>
  );
}

/** A faixa de convite no topo de "Conhecendo você". Some quando o conector já foi criado. */
export function ConectarIAFaixa() {
  const [ligado, setLigado] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/conector/chave")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { token?: string | null } | null) => vivo && setLigado(!!d?.token))
      .catch(() => vivo && setLigado(null));
    return () => {
      vivo = false;
    };
  }, []);
  if (ligado !== false) return null;
  return (
    <div className="ia-mini">
      <div>
        <b>Conecte a sua IA</b>
        <span className="t">Ela lê só o que você aprovou.</span>
      </div>
      <button type="button" className="btn" onClick={abrirConexaoDaIA}>
        Conectar
      </button>
    </div>
  );
}
