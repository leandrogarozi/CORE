"use client";

import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";

export function ConfirmModal() {
  const { confirmModal, closeConfirmModal } = useBoardCtx();
  if (!confirmModal.open) return null;

  function handleConfirm() {
    const cb = confirmModal.onConfirm;
    closeConfirmModal();
    cb?.();
  }

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={closeConfirmModal} />
      <div className="modal-panel">
        <div className="modal-title">
          {confirmModal.icon && <span className="modal-title-icon">{confirmModal.icon}</span>}
          Confirmar exclusão
        </div>
        <div className="scope-question">{confirmModal.question}</div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={closeConfirmModal}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm}>
            Excluir
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
