"use client";

import { useEffect, useState } from "react";
import { onSaveError } from "@/lib/board/error-toast";
import { WarningIcon } from "./icons";

type ToastItem = { id: number; message: string };

let nextId = 1;

/** Mostra um aviso vermelho fixo na tela sempre que um salvamento falhar de verdade —
 * sem isso, o erro ficava só no console e o item sumia sem ninguém perceber. */
export function SaveErrorToaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return onSaveError((message) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 12000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="save-error-toaster">
      {toasts.map((t) => (
        <div key={t.id} className="save-error-toast">
          <WarningIcon />
          <span>{t.message}</span>
          <button type="button" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
