"use client";

import { useBoardCtx } from "./board-context";
import type { ScopeChoice } from "@/lib/types";

const CHOICES: { v: ScopeChoice; l: string }[] = [
  { v: "esta", l: "Somente esta" },
  { v: "proximas", l: "Esta e as próximas" },
  { v: "todas", l: "Todas as ocorrências" },
];

export function ScopeModal() {
  const { scopeModal, closeScopeModal } = useBoardCtx();
  if (!scopeModal.open) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={closeScopeModal} />
      <div className="modal-panel">
        <div className="modal-title">Tarefa recorrente</div>
        <div className="scope-question">{scopeModal.question}</div>
        <div className="scope-choices">
          {CHOICES.map((c) => (
            <button
              key={c.v}
              type="button"
              className="scope-choice-btn"
              onClick={() => {
                const cb = scopeModal.onChoose;
                closeScopeModal();
                cb?.(c.v);
              }}
            >
              {c.l}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost scope-cancel" onClick={closeScopeModal}>
          Cancelar
        </button>
      </div>
    </>
  );
}
