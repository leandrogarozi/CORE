"use client";

import { useEffect, useRef, useState } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { NoteField } from "./NoteField";
import { StudyParts } from "./StudyParts";
import { PerguntasDaIA, escaparHtml } from "./PerguntasDaIA";
import { MicButton } from "./MicButton";
import { AttachmentsButton } from "./AttachmentsButton";
import { BoltIcon, BookOpenIcon, CheckIcon, ChevronIcon, DownloadIcon, LightbulbIcon, TrashIcon } from "./icons";
import { arquivoDaIdeia, arquivoDaSinapse } from "@/lib/learning-export";
import { baixarTexto, soONome } from "@/lib/baixar";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { stripHtml } from "@/lib/rich-text";
import { extrairPerguntas } from "@/lib/ia/perguntas";
import type { Synapse } from "@/lib/types";
import { TutorialLink } from "./TutorialLink";

// Sinapse é uma ideia curta. O limite vem das sinapses que já funcionam (a maior tem uns 2.400 caracteres);
// conteúdo maior que isso é um Estudo, com partes. Só vale ao escrever: o que já existe nunca é cortado.
export const LIMITE_DA_SINAPSE = 3000;

function fmtDate(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}


// Cada sinapse é um card que abre: o aprendizado em cima, a pergunta embaixo.
// A pergunta tem destaque próprio de propósito — é ela que faz o aprendizado
// voltar à cabeça depois, e é o que a IA vai usar pra perguntar na hora certa.
export function SynapseCard({ synapse, ideia = false }: { synapse: Synapse; ideia?: boolean }) {
  const { board, askConfirm } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const rotulo = ideia ? "ideia" : "sinapse";
  // Cada tipo tem o seu ícone e a sua cor suave (quadradinho + filete na esquerda do card).
  const tipoVisual = !ideia ? "sinapse" : synapse.tag === "estudo" ? "estudo" : "ideia";

  // Rascunhos locais: o que está na tela. O botão Salvar compara com o que está
  // gravado (o próprio `synapse`) — então "Salvo" só aparece quando os dois são
  // iguais de verdade, e não porque um temporizador disse que sim.
  const [title, setTitle] = useState(synapse.title);
  const [learning, setLearning] = useState(synapse.learning);
  const [questions, setQuestions] = useState(synapse.questions);
  const [source, setSource] = useState(synapse.source ?? "");
  const [passouDoLimite, setPassouDoLimite] = useState(false);
  const usados = stripHtml(learning).length;

  // O título é um campo de uma linha que cresce com o texto: no celular um título longo quebra em vez de ser cortado.
  const tituloRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = tituloRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [title, open]);

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
    <div className={"synapse-card k-" + tipoVisual + (open ? " open" : "")}>
      <div className="synapse-card-head">
        <button
          type="button"
          className="synapse-card-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronIcon />
        </button>
        <span className="tile-tipo" aria-hidden="true">
          {tipoVisual === "estudo" ? <BookOpenIcon /> : tipoVisual === "ideia" ? <LightbulbIcon /> : <BoltIcon />}
        </span>
        <div className="synapse-card-headings">
          <textarea
            ref={tituloRef}
            rows={1}
            className="synapse-card-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
          />
          {!open && (questionsPreview || learningPreview) && (
            <span className="synapse-card-preview">{questionsPreview || learningPreview}</span>
          )}
        </div>
        {ideia && (
          <span className={"synapse-tag-badge" + (synapse.tag === "estudo" ? " estudo" : "")}>
            {synapse.tag === "estudo" ? "Estudo" : "Ideia"}
          </span>
        )}
        {dirty && <span className="synapse-dirty-dot" title="Tem alteração não salva" />}
        <span className="synapse-card-date mono">{fmtDate(synapse.createdAt)}</span>
        {(() => {
          const arquivo = ideia ? arquivoDaIdeia(synapse) : arquivoDaSinapse(synapse);
          return arquivo ? (
            <button
              type="button"
              className="icon-btn"
              title="Baixar como arquivo (.md)"
              onClick={() => baixarTexto(soONome(arquivo.nome), arquivo.conteudo)}
            >
              <DownloadIcon />
            </button>
          ) : null;
        })()}
        <AttachmentsButton entityType="synapse" entityId={synapse.id} ariaLabel={`Anexos da ${rotulo}`} />
        <button
          type="button"
          className="icon-btn danger-hover"
          title={`Excluir ${rotulo}`}
          onClick={() =>
            askConfirm(`Excluir ${ideia ? "a ideia" : "a sinapse"} "${synapse.title}"?`, () => board.deleteSynapse(synapse.id))
          }
        >
          <TrashIcon />
        </button>
      </div>

      {open && (
        <div className="synapse-card-body">
          {synapse.titleAuto && (
            <div className="synapse-save-hint">Título provisório dado pelo FARO. Edite se quiser.</div>
          )}
          {ideia && (
            <div className="synapse-field">
              <span className="synapse-field-label">Tag</span>
              <div className="note-options-chips">
                {(["ideia", "estudo"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={"note-chip" + (synapse.tag === t ? " active" : "")}
                    aria-pressed={synapse.tag === t}
                    onClick={() => board.updateSynapse(synapse.id, { tag: t })}
                  >
                    {t === "ideia" ? "IDEIA" : "ESTUDO"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="synapse-field">
            <span className="synapse-field-label">
              {ideia ? (synapse.tag === "estudo" ? "Visão geral do estudo" : "A ideia") : "Qual a nova sinapse? Uma ideia curta, o aprendizado"}
            </span>
            <NoteField
              value={learning}
              placeholder={ideia ? "A ideia, do jeito que veio..." : "O que aconteceu e o que isso te ensinou..."}
              ariaLabel={ideia ? "Texto da ideia" : "Aprendizado da sinapse"}
              onChange={(html) => {
                setLearning(html);
                setPassouDoLimite(false);
              }}
              onPersist={(html) => board.updateSynapse(synapse.id, { learning: html })}
              maxChars={ideia ? undefined : LIMITE_DA_SINAPSE}
              onLimit={() => setPassouDoLimite(true)}
            />
            {!ideia && (
              <span className={"synapse-contador" + (passouDoLimite || usados > LIMITE_DA_SINAPSE * 0.9 ? " cheio" : "")}>
                {usados.toLocaleString("pt-BR")} de {LIMITE_DA_SINAPSE.toLocaleString("pt-BR")} caracteres
                {passouDoLimite ? ". Não coube: sinapse é uma ideia curta. Para um conteúdo maior, crie um Estudo em Ideias e Estudos." : ""}
              </span>
            )}
          </label>

          {/* O botão de perguntas fica na sinapse e dentro de cada parte do estudo; a visão geral é só um resumo. */}
          {!ideia && (
          <PerguntasDaIA
            titulo={cleanTitle}
            texto={stripHtml(learning)}
            existentes={[
              ...extrairPerguntas(stripHtml(questions)),
              ...board.state.metanoiaFrases
                .filter((f) => f.tipo === "pergunta")
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((f) => f.texto),
            ]}
            podeNaSinapse
            jaTem={stripHtml(questions).length > 0}
            onEnviar={(naSinapse, naMetanoia) => {
              let nSinapse = 0;
              if (naSinapse.length) {
                const jaTem = stripHtml(questions).toLowerCase();
                const novas = naSinapse.filter((q) => !jaTem.includes(q.toLowerCase()));
                if (novas.length) {
                  const html = questions + novas.map((q) => `<p>${escaparHtml(q)}</p>`).join("");
                  setQuestions(html);
                  board.updateSynapse(synapse.id, { questions: html });
                }
                nSinapse = novas.length;
              }
              // Marcar o check é a aprovação: a pergunta entra na Metanoia já aprovada.
              const nMetanoia = naMetanoia.filter(
                (q) => board.addMetanoiaFrase({ texto: q, tipo: "pergunta", origem: "ia", fonte: `${"Sinapse"}: ${cleanTitle}`, status: "aprovada" }) !== null
              ).length;
              return { naSinapse: nSinapse, naMetanoia: nMetanoia };
            }}
          />

          )}

          {ideia && synapse.tag === "estudo" && <StudyParts synapse={synapse} />}

          {!ideia && (
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
          )}

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

  const synapses = board.state.synapses.filter((s) => s.kind !== "ideia");

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Novas Sinapses</span>
        <TutorialLink secao="sinapses" />
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
              placeholder="Dar um nome pra nova sinapse e pressionar Enter"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={handleAdd}
            />
            <MicButton onText={(t) => setNewTitle((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar a sinapse" />
            <EnviarBtn onClick={() => handleAdd()} label="Adicionar" />
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
