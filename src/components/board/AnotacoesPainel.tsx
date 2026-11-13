"use client";

import { useBoardCtx } from "./board-context";
import { EditIcon } from "./icons";
import { pareceSaude } from "@/lib/ia/categoria";

/** Anotação com senha, login ou assunto de saúde: o painel não mostra o texto (pode estar numa tela compartilhada). */
const SENSIVEL = /senha|password|passwd|login|usu[aá]rio|token|c[oó]digo de acesso|\bpin\b|cart[aã]o de cr[eé]dito|\bcvv\b/i;
function ehSensivel(texto: string): boolean {
  return SENSIVEL.test(texto) || pareceSaude(texto);
}

/** No Dashboard: as anotações novas esperando revisão. Some quando não há nenhuma. */
export function AnotacoesPainel({ onAbrir }: { onAbrir: () => void }) {
  const { board } = useBoardCtx();
  const novas = board.state.quickNotes.filter((n) => n.status === "new" && !n.reviewedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
          <li key={n.id}>
            {ehSensivel(n.body) ? (
              <span className="anot-painel-oculto" title="O texto fica escondido aqui porque parece ter senha, login ou assunto de saúde. Abra a anotação para ler.">
                Texto oculto: parece conter senha ou dado pessoal
              </span>
            ) : n.body.length > 110 ? (
              n.body.slice(0, 107) + "…"
            ) : (
              n.body
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
