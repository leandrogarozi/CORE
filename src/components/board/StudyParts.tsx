"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { NoteField } from "./NoteField";
import { PerguntasDaIA } from "./PerguntasDaIA";
import { ChevronIcon, TrashIcon } from "./icons";
import { stripHtml } from "@/lib/rich-text";
import { extrairPerguntas } from "@/lib/ia/perguntas";
import { escaparHtml } from "./PerguntasDaIA";
import { todayISO } from "@/lib/date-utils";
import { ROTEIRO_DA_PARTE, proximoNomeDeParte, TIPOS_DE_PARTE } from "@/lib/board/estudos";
import type { Synapse, SynapsePart } from "@/lib/types";

function fmtData(iso: string | null) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "sem data";
}

function PartCard({ part, numero, estudo, aberta, onToggle }: { part: SynapsePart; numero: number; estudo: string; aberta: boolean; onToggle: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const [title, setTitle] = useState(part.title);
  const [body, setBody] = useState(part.body);
  const [perguntas, setPerguntas] = useState(part.perguntas);
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
        <span className="study-part-num" aria-hidden="true">
          {numero}
        </span>
        <input
          type="text"
          className="study-part-title"
          value={title}
          aria-label="Nome do conhecimento"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const t = title.trim();
            if (t && t !== part.title) board.updateSynapsePart(part.id, { title: t });
            else setTitle(part.title);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <input
          type="date"
          className="study-part-date"
          value={part.date ?? ""}
          aria-label="Data do conhecimento"
          title={fmtData(part.date)}
          onChange={(e) => board.updateSynapsePart(part.id, { date: e.target.value || null })}
        />
        <button
          type="button"
          className="icon-btn danger-hover"
          title="Excluir conhecimento"
          onClick={() => askConfirm(`Excluir "${part.title}"? O texto dele some.`, () => board.deleteSynapsePart(part.id))}
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
          <div className="synapse-field synapse-field-question">
            <span className="synapse-field-label">Perguntas poderosas deste conteúdo</span>
            <NoteField
              value={perguntas}
              placeholder="Escreva as suas ou crie com a IA aqui embaixo..."
              ariaLabel={`Perguntas de ${part.title}`}
              onChange={setPerguntas}
              onPersist={(html) => html !== part.perguntas && board.updateSynapsePart(part.id, { perguntas: html })}
            />
          </div>
          <PerguntasDaIA
            titulo={`${estudo} — ${part.title}`}
            texto={stripHtml(body)}
            existentes={[
              ...extrairPerguntas(stripHtml(perguntas)),
              ...board.state.metanoiaFrases
                .filter((f) => f.tipo === "pergunta")
                .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
                .map((f) => f.texto),
            ]}
            podeNaSinapse
            rotuloAqui="No conhecimento"
            jaTem={stripHtml(perguntas).length > 0}
            onEnviar={(naParte, naMetanoia) => {
              let nParte = 0;
              if (naParte.length) {
                const jaTemTexto = stripHtml(perguntas).toLowerCase();
                const novas = naParte.filter((q) => !jaTemTexto.includes(q.toLowerCase()));
                if (novas.length) {
                  const html = perguntas + novas.map((q) => `<p>${escaparHtml(q)}</p>`).join("");
                  setPerguntas(html);
                  board.updateSynapsePart(part.id, { perguntas: html });
                }
                nParte = novas.length;
              }
              // Marcar o check é a aprovação: a pergunta entra na Metanoia já aprovada.
              const nMetanoia = naMetanoia.filter(
                (q) => board.addMetanoiaFrase({ texto: q, tipo: "pergunta", origem: "ia", fonte: `Estudo: ${estudo} — ${part.title}`, status: "aprovada" }) !== null
              ).length;
              return { naSinapse: nParte, naMetanoia: nMetanoia };
            }}
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
  // Número de cada conhecimento pela ordem em que foi adicionado (o 1 é o primeiro), mesmo com a lista mostrando o mais novo em cima.
  const numeros = new Map([...partes].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)).map((x, i) => [x.id, i + 1] as const));
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
          Conhecimentos <span className="study-parts-n">{partes.length}</span>
        </span>
        {!criando && (
          <button type="button" className="btn btn-accent" onClick={abrirForm}>
            + Adicionar conhecimento
          </button>
        )}
      </div>

      {criando && (
        <div className="study-part-new">
          <select value={tipo} aria-label="Tipo do conhecimento" onChange={(e) => trocarTipo(e.target.value)}>
            {TIPOS_DE_PARTE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={nome}
            aria-label="Nome do conhecimento"
            autoFocus
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
          />
          <input type="date" value={data} aria-label="Data do conhecimento" onChange={(e) => setData(e.target.value)} />
          <button type="button" className="btn btn-accent" disabled={!nome.trim()} onClick={criar}>
            Criar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setCriando(false)}>
            Cancelar
          </button>
        </div>
      )}

      {partes.length === 0 && !criando && (
        <div className="hint-text">Nenhum conhecimento ainda. Adicione o primeiro encontro, aula ou módulo.</div>
      )}
      {partes.map((p) => (
        <PartCard key={p.id} part={p} numero={numeros.get(p.id) ?? 0} estudo={synapse.title} aberta={abertaId === p.id} onToggle={() => setAbertaId((cur) => (cur === p.id ? null : p.id))} />
      ))}
    </div>
  );
}
