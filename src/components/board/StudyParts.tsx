"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { NoteField } from "./NoteField";
import { ChevronIcon, TrashIcon } from "./icons";
import { stripHtml } from "@/lib/rich-text";
import { todayISO } from "@/lib/date-utils";
import { ROTEIRO_DA_PARTE, proximoNomeDeParte, TIPOS_DE_PARTE } from "@/lib/board/estudos";
import type { Synapse, SynapsePart } from "@/lib/types";

function fmtData(iso: string | null) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "sem data";
}

function PartCard({ part, aberta, onToggle }: { part: SynapsePart; aberta: boolean; onToggle: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const [title, setTitle] = useState(part.title);
  const [body, setBody] = useState(part.body);
  // Trocar o texto de fora (roteiro) pede um campo novo: o editor não relê o valor sozinho.
  const [versao, setVersao] = useState(0);

  const previa = stripHtml(part.body);

  function usarRoteiro() {
    setBody(ROTEIRO_DA_PARTE);
    board.updateSynapsePart(part.id, { body: ROTEIRO_DA_PARTE });
    setVersao((v) => v + 1);
  }

  return (
    <div className={"study-part" + (aberta ? " open" : "")}>
      <div className="study-part-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={aberta} onClick={onToggle}>
          <ChevronIcon />
        </button>
        <input
          type="text"
          className="study-part-title"
          value={title}
          aria-label="Nome da parte"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const t = title.trim();
            if (t && t !== part.title) board.updateSynapsePart(part.id, { title: t });
            else setTitle(part.title);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="study-part-kind">{part.kind}</span>
        <input
          type="date"
          className="study-part-date"
          value={part.date ?? ""}
          aria-label="Data da parte"
          title={fmtData(part.date)}
          onChange={(e) => board.updateSynapsePart(part.id, { date: e.target.value || null })}
        />
        <button
          type="button"
          className="icon-btn danger-hover"
          title="Excluir parte"
          onClick={() => askConfirm(`Excluir a parte "${part.title}"? O texto dela some.`, () => board.deleteSynapsePart(part.id))}
        >
          <TrashIcon />
        </button>
      </div>
      {!aberta && previa && <div className="study-part-previa">{previa}</div>}
      {aberta && (
        <div className="study-part-body">
          <NoteField
            key={versao}
            value={body}
            placeholder="O que foi visto, o que anotou, a atividade..."
            ariaLabel={`Texto de ${part.title}`}
            onChange={setBody}
            onPersist={(html) => html !== part.body && board.updateSynapsePart(part.id, { body: html })}
          />
          {!stripHtml(body) && (
            <button type="button" className="btn btn-ghost study-part-roteiro" onClick={usarRoteiro}>
              Usar roteiro (O que vi · Atividade · O que vou aplicar)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// As partes de um Estudo: cada encontro, aula ou módulo com o próprio texto, em vez de um bloco só.
export function StudyParts({ synapse }: { synapse: Synapse }) {
  const { board } = useBoardCtx();
  const partes = board.state.synapseParts
    .filter((p) => p.synapseId === synapse.id)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.order - a.order);
  const [abertaId, setAbertaId] = useState<string | null>(partes[0]?.id ?? null);
  const [criando, setCriando] = useState(false);
  const [tipo, setTipo] = useState<string>(TIPOS_DE_PARTE[0]);
  const [nome, setNome] = useState("");
  const [data, setData] = useState(() => todayISO());

  function abrirForm() {
    setTipo(TIPOS_DE_PARTE[0]);
    setNome(proximoNomeDeParte(TIPOS_DE_PARTE[0], partes));
    setData(todayISO());
    setCriando(true);
  }

  function trocarTipo(t: string) {
    setTipo(t);
    setNome(proximoNomeDeParte(t, partes));
  }

  function criar() {
    const id = board.addSynapsePart(synapse.id, { title: nome, kind: tipo.toLowerCase(), date: data || null });
    if (!id) return;
    setAbertaId(id);
    setCriando(false);
  }

  return (
    <div className="study-parts">
      <div className="study-parts-head">
        <span className="synapse-field-label">
          Partes <span className="study-parts-n">{partes.length}</span>
        </span>
        {!criando && (
          <button type="button" className="btn btn-accent" onClick={abrirForm}>
            + Nova parte
          </button>
        )}
      </div>

      {criando && (
        <div className="study-part-new">
          <select value={tipo} aria-label="Tipo da parte" onChange={(e) => trocarTipo(e.target.value)}>
            {TIPOS_DE_PARTE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={nome}
            aria-label="Nome da parte"
            autoFocus
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
          />
          <input type="date" value={data} aria-label="Data da parte" onChange={(e) => setData(e.target.value)} />
          <button type="button" className="btn btn-accent" disabled={!nome.trim()} onClick={criar}>
            Criar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setCriando(false)}>
            Cancelar
          </button>
        </div>
      )}

      {partes.length === 0 && !criando && (
        <div className="hint-text">Nenhuma parte ainda. Crie o primeiro encontro, aula ou módulo.</div>
      )}
      {partes.map((p) => (
        <PartCard key={p.id} part={p} aberta={abertaId === p.id} onToggle={() => setAbertaId((cur) => (cur === p.id ? null : p.id))} />
      ))}
    </div>
  );
}
