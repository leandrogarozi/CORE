"use client";

import { useState } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { NoteField } from "./NoteField";
import { StudyParts } from "./StudyParts";
import { MicButton } from "./MicButton";
import { AttachmentsButton } from "./AttachmentsButton";
import { BoltIcon, CheckIcon, ChevronIcon, DownloadIcon, TrashIcon } from "./icons";
import { arquivoDaIdeia, arquivoDaSinapse } from "@/lib/learning-export";
import { baixarTexto, soONome } from "@/lib/baixar";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { stripHtml } from "@/lib/rich-text";
import type { Synapse } from "@/lib/types";
import { TutorialLink } from "./TutorialLink";

function fmtDate(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}


const ERROS_DAS_PERGUNTAS: Record<string, string> = {
  texto_curto: "Escreva um pouco mais no aprendizado antes de criar as perguntas.",
  sem_chave: "A IA ainda não está ligada (falta a chave na Vercel).",
  teto: "O teto de gasto da IA deste mês foi atingido. Ajuste em Configurações.",
  chave_invalida: "A chave da IA não foi aceita pela Anthropic.",
};

const escaparHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type PerguntaGerada = { texto: string; naSinapse: boolean; naMetanoia: boolean };

/**
 * "Criar perguntas poderosas": a IA lê o texto da sinapse e sugere perguntas. Nada vai a lugar nenhum
 * sozinho: cada pergunta tem dois checks (na sinapse, na Metanoia) e só o que está marcado é enviado.
 */
function PerguntasDaIA({
  titulo,
  texto,
  podeNaSinapse,
  onEnviar,
}: {
  titulo: string;
  texto: string;
  podeNaSinapse: boolean;
  onEnviar: (naSinapse: string[], naMetanoia: string[]) => { naSinapse: number; naMetanoia: number };
}) {
  const [gerando, setGerando] = useState(false);
  const [lista, setLista] = useState<PerguntaGerada[]>([]);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function gerar() {
    setGerando(true);
    setErro("");
    setAviso("");
    try {
      const r = await fetch("/api/ia/perguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, texto }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErro(ERROS_DAS_PERGUNTAS[d.erro] ?? "Não consegui criar agora. Tente de novo em instantes.");
      else setLista((d.perguntas as string[]).map((t) => ({ texto: t, naSinapse: false, naMetanoia: false })));
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  const marcadas = lista.filter((p) => p.naSinapse || p.naMetanoia).length;

  function marcar(i: number, campo: "naSinapse" | "naMetanoia", valor: boolean) {
    setLista((l) => l.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  }

  function enviar() {
    const feito = onEnviar(
      lista.filter((p) => p.naSinapse).map((p) => p.texto),
      lista.filter((p) => p.naMetanoia).map((p) => p.texto)
    );
    const partes = [
      feito.naSinapse ? `${feito.naSinapse} na sinapse` : "",
      feito.naMetanoia ? `${feito.naMetanoia} na Metanoia` : "",
    ].filter(Boolean);
    setAviso(partes.length ? `Enviado: ${partes.join(" e ")}.` : "Nada novo para enviar (já estavam lá).");
    // O que foi enviado sai da lista; o que ficou sem marca continua para você decidir.
    setLista((l) => l.filter((p) => !p.naSinapse && !p.naMetanoia));
  }

  return (
    <div className="perg-ia">
      <div className="perg-ia-topo">
        <button type="button" className="btn btn-ghost" disabled={gerando || texto.length < 40} onClick={gerar}>
          <BoltIcon /> {gerando ? "Criando perguntas…" : lista.length ? "Criar outras perguntas" : "Criar perguntas poderosas"}
        </button>
        <span className="perg-ia-dica">A IA lê só este texto e sugere. Você marca para onde cada pergunta vai.</span>
      </div>
      {erro && <p className="perg-ia-erro">{erro}</p>}
      {aviso && !lista.length && <p className="perg-ia-aviso">{aviso}</p>}
      {lista.length > 0 && (
        <div className="perg-ia-lista">
          {aviso && <p className="perg-ia-aviso">{aviso}</p>}
          <div className="perg-ia-cab" aria-hidden="true">
            {podeNaSinapse && <span>Na sinapse</span>}
            <span>Na Metanoia</span>
          </div>
          {lista.map((p, i) => (
            <div key={p.texto} className="perg-ia-linha">
              <span className="perg-ia-texto">{p.texto}</span>
              {podeNaSinapse && (
                <label className="perg-ia-check" title="Guardar esta pergunta na sinapse">
                  <input type="checkbox" checked={p.naSinapse} onChange={(e) => marcar(i, "naSinapse", e.target.checked)} />
                  <span className="sr-only">Na sinapse</span>
                </label>
              )}
              <label className="perg-ia-check" title="Mandar para a Metanoia">
                <input type="checkbox" checked={p.naMetanoia} onChange={(e) => marcar(i, "naMetanoia", e.target.checked)} />
                <span className="sr-only">Na Metanoia</span>
              </label>
            </div>
          ))}
          <div className="perg-ia-rodape">
            <button type="button" className={"btn" + (marcadas ? " btn-accent" : " btn-ghost")} disabled={!marcadas} onClick={enviar}>
              Enviar {marcadas ? `as ${marcadas} marcadas` : "marcadas"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setLista([])}>
              Descartar o resto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Cada sinapse é um card que abre: o aprendizado em cima, a pergunta embaixo.
// A pergunta tem destaque próprio de propósito — é ela que faz o aprendizado
// voltar à cabeça depois, e é o que a IA vai usar pra perguntar na hora certa.
export function SynapseCard({ synapse, ideia = false }: { synapse: Synapse; ideia?: boolean }) {
  const { board, askConfirm } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const rotulo = ideia ? "ideia" : "sinapse";

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
        {!ideia && <span className="synapse-etiqueta">SINAPSE</span>}
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
              {ideia ? (synapse.tag === "estudo" ? "Visão geral do estudo" : "A ideia") : "Qual a nova sinapse — o aprendizado?"}
            </span>
            <NoteField
              value={learning}
              placeholder={ideia ? "A ideia, do jeito que veio..." : "O que aconteceu e o que isso te ensinou..."}
              ariaLabel={ideia ? "Texto da ideia" : "Aprendizado da sinapse"}
              onChange={setLearning}
              onPersist={(html) => board.updateSynapse(synapse.id, { learning: html })}
            />
          </label>

          <PerguntasDaIA
            titulo={cleanTitle}
            texto={stripHtml(learning)}
            podeNaSinapse={!ideia}
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
                (q) => board.addMetanoiaFrase({ texto: q, tipo: "pergunta", origem: "ia", fonte: `${ideia ? "Ideia" : "Sinapse"}: ${cleanTitle}`, status: "aprovada" }) !== null
              ).length;
              return { naSinapse: nSinapse, naMetanoia: nMetanoia };
            }}
          />

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
