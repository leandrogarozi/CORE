"use client";

import { useBoardCtx } from "./board-context";
import { todayISO } from "@/lib/date-utils";
import { creditoDaFrase, fraseDaVez } from "@/lib/metanoia";

// A frase do dia no painel: a mesma que o FARO manda na primeira notificação. Some quando não há frase aprovada.
export function FraseDoDia({ onAbrir }: { onAbrir: () => void }) {
  const { board } = useBoardCtx();
  const f = fraseDaVez(board.state.metanoiaFrases, todayISO(), 0);
  if (!f) return null;
  const credito = creditoDaFrase(f);
  return (
    <button type="button" className="frase-do-dia" onClick={onAbrir} title="Abrir a Metanoia">
      <span className="frase-do-dia-texto">&ldquo;{f.texto}&rdquo;</span>
      {credito && <span className="frase-do-dia-credito">{credito}</span>}
    </button>
  );
}
