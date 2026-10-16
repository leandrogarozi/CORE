"use client";

import { useBoardCtx } from "./board-context";
import { CakeIcon } from "./icons";
import { diasAteAniversario, ordenarPorProximos } from "@/lib/board/aniversarios";
import { todayISO } from "@/lib/date-utils";

const JANELA_DIAS = 3;

/**
 * Uma linha discreta na home: quem faz aniversário hoje ou nos próximos dias.
 * Some quando não há ninguém (a home já é cheia). Clicar leva à lista.
 */
export function AniversariosNaHome({ onOpen }: { onOpen: () => void }) {
  const { board } = useBoardCtx();
  const hoje = todayISO();
  const proximos = ordenarPorProximos(board.state.birthdays, hoje).filter((b) => diasAteAniversario(b, hoje) <= JANELA_DIAS);
  if (!proximos.length) return null;

  const partes = proximos.slice(0, 4).map((b) => {
    const d = diasAteAniversario(b, hoje);
    const quando = d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`;
    return `${b.name.trim().split(/\s+/)[0]} (${quando})`;
  });
  const mais = proximos.length > 4 ? ` +${proximos.length - 4}` : "";

  return (
    <button type="button" className="home-aniv" onClick={onOpen} title="Abrir Aniversários">
      <CakeIcon />
      <span>
        Aniversário: {partes.join(" · ")}
        {mais}
      </span>
    </button>
  );
}
