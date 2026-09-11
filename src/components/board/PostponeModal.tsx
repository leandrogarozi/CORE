"use client";

import { useState } from "react";
import { MicButton } from "./MicButton";
import { ShieldWarningIcon } from "./icons";
import { fmtShortDate } from "@/lib/date-utils";

// Pedido de justificativa pra adiar uma tarefa DESAFIADORA.
//
// São duas perguntas de propósito, e a segunda é a que morde: o motivo é o que
// a pessoa diria em voz alta; a "historinha" é o que ela conta a si mesma pra
// não fazer. A palavra é do próprio Leandro e fica na tela justamente porque
// nomear a desculpa já quebra metade dela.
//
// O texto não julga e não bloqueia — dá pra adiar de qualquer jeito. O que não
// dá é adiar em silêncio.
export function PostponeModal({
  taskTitle,
  fromDate,
  toDate,
  jaAdiada,
  onConfirm,
  onCancel,
}: {
  taskTitle: string;
  fromDate: string;
  toDate: string | null;
  /** Quantas vezes essa tarefa já foi adiada antes desta. */
  jaAdiada: number;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [historinha, setHistorinha] = useState("");

  function confirmar() {
    const partes = [
      motivo.trim() ? `Motivo: ${motivo.trim()}` : null,
      historinha.trim() ? `Historinha: ${historinha.trim()}` : null,
    ].filter(Boolean);
    onConfirm(partes.join("\n"));
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal-panel postpone-panel">
        <div className="postpone-head">
          <span className="postpone-icon">
            <ShieldWarningIcon />
          </span>
          <div>
            <div className="modal-title">Adiando uma tarefa desafiadora</div>
            <div className="postpone-task">{taskTitle}</div>
          </div>
        </div>

        <div className="postpone-move">
          {fmtShortDate(fromDate)} → {toDate ? fmtShortDate(toDate) : "sem data"}
          {jaAdiada > 0 && (
            <span className="postpone-count">
              {jaAdiada === 1 ? "já adiada 1 vez antes" : `já adiada ${jaAdiada} vezes antes`}
            </span>
          )}
        </div>

        <label className="postpone-field">
          <span className="postpone-label">Por que você está fugindo dessa tarefa?</span>
          <div className="postpone-input-row">
            <textarea
              rows={2}
              autoFocus
              value={motivo}
              placeholder="O que está realmente te travando aqui..."
              onChange={(e) => setMotivo(e.target.value)}
            />
            <MicButton onText={(t) => setMotivo((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o motivo" />
          </div>
        </label>

        <label className="postpone-field">
          <span className="postpone-label">Que historinha você está contando pra não fazer?</span>
          <div className="postpone-input-row">
            <textarea
              rows={2}
              value={historinha}
              placeholder='"Amanhã eu rendo mais", "preciso de mais informação antes"...'
              onChange={(e) => setHistorinha(e.target.value)}
            />
            <MicButton onText={(t) => setHistorinha((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar a historinha" />
          </div>
        </label>

        <p className="postpone-hint">
          Fica registrado. Depois de algumas semanas isso mostra o padrão do que você adia e com que desculpa.
        </p>

        <div className="edit-actions edit-actions-split">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Deixar pra hoje mesmo
          </button>
          <button type="button" className="btn btn-accent" onClick={confirmar}>
            Adiar assim mesmo
          </button>
        </div>
      </div>
    </>
  );
}
