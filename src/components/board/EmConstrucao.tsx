"use client";

import { useBoardCtx } from "./board-context";

/** Só quem testa vê: avisa que a tela ainda está sendo ajustada. A conta do dono não mostra (ela é quem ajusta). */
export function useEmConstrucao(): boolean {
  const { board } = useBoardCtx();
  return board.state.settings.featureFlags.modo_dono !== true;
}

export function EmConstrucao({ tela }: { tela: string }) {
  const mostrar = useEmConstrucao();
  if (!mostrar) return null;
  return (
    <div className="em-construcao" role="note">
      <span className="em-construcao-selo">Em construção</span>
      <span>
        {tela} ainda está sendo ajustada. Pode mudar de lugar ou de jeito nos próximos dias. Use à vontade e conte o que achou no canal de feedback.
      </span>
    </div>
  );
}
