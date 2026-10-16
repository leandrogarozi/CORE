"use client";

import { useBoardCtx } from "./board-context";
import { CakeIcon } from "./icons";
import { diasAteAniversario, ordenarPorProximos } from "@/lib/board/aniversarios";
import { todayISO } from "@/lib/date-utils";
import type { ViewMode } from "./Sidebar";

/** A partir de quantos dias antes o bolinho acende. */
export const DIAS_DE_AVISO_DO_ANIVERSARIO = 3;

/**
 * O bolinho na barra de cima, ao lado dos Avisos. Apagado quando ninguém faz
 * aniversário nos próximos 3 dias; aceso (cor de destaque) quando há; com o
 * número de quem faz aniversário HOJE. Passar o mouse mostra quem e quando;
 * clicar abre a lista de Aniversários.
 */
export function AniversariosButton({ onNavigate }: { onNavigate: (modo: ViewMode) => void }) {
  const { board } = useBoardCtx();
  const hoje = todayISO();
  const perto = ordenarPorProximos(board.state.birthdays, hoje).filter(
    (b) => diasAteAniversario(b, hoje) <= DIAS_DE_AVISO_DO_ANIVERSARIO
  );
  const hojeN = perto.filter((b) => diasAteAniversario(b, hoje) === 0).length;

  const dica = perto.length
    ? perto
        .map((b) => {
          const d = diasAteAniversario(b, hoje);
          return `${d === 0 ? "Hoje" : d === 1 ? "Amanhã" : `Em ${d} dias`}: aniversário de ${b.name.trim()}`;
        })
        .join("\n")
    : `Aniversários (ninguém faz nos próximos ${DIAS_DE_AVISO_DO_ANIVERSARIO} dias)`;

  return (
    <button
      type="button"
      className={"icon-btn aviso-icon-btn aniv-btn" + (perto.length ? " aviso-novo aniv-perto" : "")}
      aria-label={dica.replace(/\n/g, ". ")}
      title={dica}
      onClick={() => onNavigate("aniversarios")}
    >
      <CakeIcon />
      {hojeN > 0 && <span className="reminders-btn-count aviso-count">{hojeN > 9 ? "9+" : hojeN}</span>}
    </button>
  );
}
