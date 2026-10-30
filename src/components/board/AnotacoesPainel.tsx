"use client";

import { useBoardCtx } from "./board-context";
import { EditIcon } from "./icons";

/** No Dashboard: as anotações novas esperando revisão. Some quando não há nenhuma. */
export function AnotacoesPainel({ onAbrir }: { onAbrir: () => void }) {
  const { board } = useBoardCtx();
  const novas = board.state.quickNotes.filter((n) => n.status === "new").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (novas.length === 0) return null;
  return (
    <div className="anot-painel">
      <div className="anot-painel-topo">
        <span className="tile-tipo" style={{ "--k": "#3B82C4" } as React.CSSProperties}>
          <EditIcon />
        </span>
        <b>
          {novas.length} {novas.length === 1 ? "anotação para revisar" : "anotações para revisar"}
        </b>
        <button type="button" className="btn btn-ghost" onClick={onAbrir}>
          Revisar
        </button>
      </div>
      <ul>
        {novas.slice(0, 3).map((n) => (
          <li key={n.id}>{n.body.length > 110 ? n.body.slice(0, 107) + "…" : n.body}</li>
        ))}
      </ul>
    </div>
  );
}
