"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { NoteField } from "./NoteField";
import { BoltIcon, CheckIcon, ChevronIcon, TrashIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { stripHtml } from "@/lib/rich-text";
import type { Synapse } from "@/lib/types";

function fmtDate(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

// Cada sinapse é um card que abre: o aprendizado em cima, a pergunta embaixo.
// A pergunta tem destaque próprio de propósito — é ela que faz o aprendizado
// voltar à cabeça depois, e é o que a IA vai usar pra perguntar na hora certa.
function SynapseCard({ synapse }: { synapse: Synapse }) {
  const { board, askConfirm } = useBoardCtx();
  const [open, setOpen] = useState(false);

  // Rascunhos locais: o que está na tela. O botão Salvar compara com o que está
  // gravado (o próprio `synapse`) — então "Salvo" só aparece quando os dois são
  // iguais de verdade, e não porque um temporizador disse que sim.
  const [title, setTitle] = useState(synapse.title);
  const [learning, setLearning] = useState(synapse.learning);
  const [questions, setQuestions] = useState(synapse.questions);
  const [source, setSource] = useState(synapse.source ?? "");

  const cleanTitle = title.trim() || synapse.title;
  const cleanSource = source.trim() || null;
  const dirty =
    cleanTitle !== synapse.title ||
    learning !== synapse.learning ||
    questions !== synapse.questions ||
    cleanSource !== synapse.source;

  const questionsPreview = stripHtml(synapse.questions);
  const learningPreview = stripHtml(synapse.learning);

  function save() {
    if (!dirty) return;
    board.updateSynapse(synapse.id, {
      title: cleanTitle,
      learning,
      questions,
      source: cleanSource,
    });
    setTitle(cleanTitle);
  }

  return (
    <div className={"synapse-card" + (open ? " open" : "")}>
      <div className="synapse-card-head">
        <button
          type="button"
          className="synapse-card-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronIcon />
        </button>
        <div className="synapse-card-headings">
          <input
            type="text"
            className="synapse-card-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          {!open && (questionsPreview || learningPreview) && (
            <span className="synapse-card-preview">{questionsPreview || learningPreview}</span>
          )}
        </div>
        {dirty && <span className="synapse-dirty-dot" title="Tem alteração não salva" />}
        <span className="synapse-card-date mono">{fmtDate(synapse.createdAt)}</span>
        <button
          type="button"
          className="icon-btn danger-hover"
          title="Excluir sinapse"
          onClick={() =>
            askConfirm(`Excluir a sinapse "${synapse.title}"?`, () => board.deleteSynapse(synapse.id))
          }
        >
          <TrashIcon />
        </button>
      </div>

      {open && (
        <div className="synapse-card-body">
          <label className="synapse-field">
            <span className="synapse-field-label">Qual a nova sinapse — o aprendizado?</span>
            <NoteField
              value={learning}
              placeholder="O que aconteceu e o que isso te ensinou..."
              ariaLabel="Aprendizado da sinapse"
              onChange={setLearning}
              onPersist={(html) => board.updateSynapse(synapse.id, { learning: html })}
            />
          </label>

          <label className="synapse-field synapse-field-question">
            <span className="synapse-field-label">Qual a pergunta que esse aprendizado gera?</span>
            <NoteField
              value={questions}
              placeholder="A pergunta que te reconecta com esse aprendizado..."
              ariaLabel="Perguntas da sinapse"
              onChange={setQuestions}
              onPersist={(html) => board.updateSynapse(synapse.id, { questions: html })}
            />
          </label>

          <label className="synapse-field">
            <span className="synapse-field-label">De onde veio (opcional)</span>
            <input
              type="text"
              className="synapse-source-input"
              value={source}
              placeholder="Conversa, livro, filme, aula..."
              onChange={(e) => setSource(e.target.value)}
            />
          </label>

          <div className="edit-actions synapse-card-actions">
            <span className="synapse-save-hint">
              {dirty ? "Alteração ainda não salva" : "Tudo salvo"}
            </span>
            <button
              type="button"
              className={"btn" + (dirty ? " btn-accent" : " btn-ghost saved-btn")}
              disabled={!dirty}
              onClick={save}
            >
              {dirty ? (
                "Salvar"
              ) : (
                <>
                  <CheckIcon /> Salvo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SynapsesView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [newTitle, setNewTitle] = useState("");

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    const id = await board.addSynapse(title);
    if (!id) setNewTitle(title);
  }

  const synapses = board.state.synapses;

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Novas Sinapses</span>
        <span style={{ width: 30 }} />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <BoltIcon filled /> Qual a nova sinapse?
          </div>
          <p>
            Novas sinapses são pra anotar novos aprendizados e percepções que geram novas crenças. Toda
            nova sinapse tem uma <strong>pergunta que a conecta</strong> — é a pergunta que faz lembrar
            dela na hora certa. Novas sinapses são aprendizados capazes de gerar mudança.
          </p>
        </div>

        <div className="list-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Dar um nome pra nova sinapse e pressionar Enter"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={handleAdd}
            />
          </div>
        </div>

        {!synapses.length && (
          <div className="list-card">
            <div className="hp-empty">Nenhuma sinapse ainda. A primeira pode ser a de hoje.</div>
          </div>
        )}

        <div className="synapse-list">
          {synapses.map((sy) => (
            <SynapseCard key={sy.id} synapse={sy} />
          ))}
        </div>
      </div>
    </div>
  );
}
