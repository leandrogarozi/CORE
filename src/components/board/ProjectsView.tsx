"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { AttachmentsButton } from "./AttachmentsButton";
import { TaskRow } from "./TaskRow";
import { CheckCircleIcon, CheckIcon, ClockIcon, CloseCircleIcon, EditIcon, PlayCircleIcon } from "./icons";
import { RichTextEditor } from "./RichTextEditor";
import { fmtHM } from "@/lib/date-utils";
import { CATEGORY_LABEL, PROJECT_NAMING_TEMPLATE_DEFAULT, type Category, type Project } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

function applyNamingTemplate(template: string, projectName: string, n: number): string {
  return template.replace(/\{projeto\}/g, () => projectName).replace(/\{etapa\}/g, () => String(n).padStart(2, "0"));
}

function projectProgress(projectId: string, tasks: { projectId: string | null; done: boolean }[]) {
  const steps = tasks.filter((t) => t.projectId === projectId);
  return { done: steps.filter((t) => t.done).length, total: steps.length };
}

function ProjectListRow({
  project,
  progress,
  onOpen,
}: {
  project: Project;
  progress: { done: number; total: number };
  onOpen: () => void;
}) {
  return (
    <button type="button" className={"project-row" + (project.status !== "active" ? " done" : "")} onClick={onOpen}>
      <span className="project-row-name">{project.name}</span>
      <span className="project-row-progress mono">
        {progress.total > 0 ? `${progress.done}/${progress.total}` : "sem etapas"}
      </span>
    </button>
  );
}

function ProjectListView({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const { board } = useBoardCtx();
  const [newName, setNewName] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    board.addProject(name);
    setNewName("");
  }

  const active = board.state.projects.filter((p) => p.status === "active");
  const done = board.state.projects.filter((p) => p.status === "done");
  const cancelled = board.state.projects.filter((p) => p.status === "cancelled");

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Projetos</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list">
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Novo projeto e pressionar Enter"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
        </div>

        <div className="list-card">
          <div className="list-card-section-label active-label">
            <PlayCircleIcon /> Projetos ativos
          </div>
          {active.length === 0 ? (
            <div className="hp-empty">Nenhum projeto ativo.</div>
          ) : (
            active.map((p) => (
              <ProjectListRow
                key={p.id}
                project={p}
                progress={projectProgress(p.id, board.state.tasks)}
                onOpen={() => onOpen(p.id)}
              />
            ))
          )}
        </div>

        {done.length > 0 && (
          <div className="list-card">
            <div className="list-card-section-label done-label">
              <CheckCircleIcon /> Concluídos
            </div>
            {done.map((p) => (
              <ProjectListRow
                key={p.id}
                project={p}
                progress={projectProgress(p.id, board.state.tasks)}
                onOpen={() => onOpen(p.id)}
              />
            ))}
          </div>
        )}

        {cancelled.length > 0 && (
          <div className="list-card">
            <div className="list-card-section-label cancelled-label">
              <CloseCircleIcon /> Cancelados
            </div>
            {cancelled.map((p) => (
              <ProjectListRow
                key={p.id}
                project={p}
                progress={projectProgress(p.id, board.state.tasks)}
                onOpen={() => onOpen(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectDetailView({ project, onBack }: { project: Project; onBack: () => void }) {
  const { board, askConfirm, columns } = useBoardCtx();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<string | null>(null);
  const namingTemplate = project.namingTemplate ?? PROJECT_NAMING_TEMPLATE_DEFAULT;
  const steps = [...board.state.tasks]
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const [newStepTitle, setNewStepTitle] = useState(() => applyNamingTemplate(namingTemplate, project.name, steps.length + 1));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [namingEditorOpen, setNamingEditorOpen] = useState(false);
  const [namingDraft, setNamingDraft] = useState(namingTemplate);

  // Coluna inicial mais larga aqui pra caber o número da ordem além do grip.
  const stepGridTemplate = columns.gridTemplate.replace(/^30px/, "38px");

  function handleStepDrop() {
    if (!draggingId) return;
    const ids = steps.map((t) => t.id);
    const fromIdx = ids.indexOf(draggingId);
    let toIdx = overId ? ids.indexOf(overId) : ids.length - 1;
    if (fromIdx === -1) return;
    if (toIdx === -1) toIdx = ids.length - 1;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggingId);
    board.reorderBucket(`project-${project.id}`, ids);
    setDraggingId(null);
    setOverId(null);
  }
  const doneCount = steps.filter((t) => t.done).length;
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
  const totalTrackedMin = Math.round(steps.reduce((sum, t) => sum + (t.trackedSeconds || 0), 0) / 60);

  function commitName() {
    if (nameDraft === null) return;
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== project.name) board.updateProject(project.id, { name: trimmed });
    setNameDraft(null);
  }

  function commitDesc() {
    if (descDraft === null) return;
    if (descDraft !== project.description) board.updateProject(project.id, { description: descDraft });
    setDescDraft(null);
  }

  function saveEdits() {
    commitName();
    commitDesc();
  }

  const isDirty =
    (nameDraft !== null && nameDraft.trim() !== "" && nameDraft.trim() !== project.name) ||
    (descDraft !== null && descDraft !== project.description);

  function addStep() {
    const title = newStepTitle.trim();
    const prefix = applyNamingTemplate(namingTemplate, project.name, steps.length + 1).trim();
    if (!title || title === prefix) return;
    board.addTaskToProject(project.id, title);
    setNewStepTitle(applyNamingTemplate(namingTemplate, project.name, steps.length + 2));
  }

  function saveNamingTemplate() {
    const newTemplate = namingDraft.trim() || PROJECT_NAMING_TEMPLATE_DEFAULT;
    steps.forEach((step, idx) => {
      const oldPrefix = applyNamingTemplate(namingTemplate, project.name, idx + 1);
      const newPrefix = applyNamingTemplate(newTemplate, project.name, idx + 1);
      const newTitle = step.title.startsWith(oldPrefix)
        ? newPrefix + step.title.slice(oldPrefix.length)
        : newPrefix + step.title;
      if (newTitle !== step.title) board.updateTaskTitle(step.id, newTitle);
    });
    board.updateProject(project.id, { namingTemplate: newTemplate });
    setNewStepTitle(applyNamingTemplate(newTemplate, project.name, steps.length + 1));
    setNamingEditorOpen(false);
  }

  function markDone() {
    board.updateProject(project.id, { status: "done" });
  }

  function markCancelled() {
    board.updateProject(project.id, { status: "cancelled" });
  }

  function reopen() {
    board.updateProject(project.id, { status: "active" });
  }

  function handleDelete() {
    askConfirm(
      `Excluir o projeto "${project.name}"? As tarefas continuam existindo, só deixam de estar vinculadas.`,
      () => {
        board.deleteProject(project.id);
        onBack();
      }
    );
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Projeto</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list project-wide">
        <div className="diet-page-card">
          <div className="project-name-row">
            <input
              type="text"
              className="project-name-input"
              value={nameDraft ?? project.name}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <span className="project-time-badge mono" title="Soma total do tempo do projeto">
              <ClockIcon /> {fmtHM(totalTrackedMin)}
            </span>
            <AttachmentsButton entityType="project" entityId={project.id} ariaLabel="Anexos do projeto" />
          </div>
          <RichTextEditor
            value={descDraft ?? project.description}
            onChange={setDescDraft}
            placeholder="Objetivo, notas sobre o plano..."
          />
          {steps.length > 0 && (
            <div className="project-progress-row">
              <div className="hp-bar">
                <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="project-progress-label mono">
                {doneCount}/{steps.length}
              </span>
            </div>
          )}
          <div className="edit-actions">
            <button type="button" className="btn btn-ghost danger-hover" onClick={handleDelete}>
              Excluir projeto
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setNamingDraft(namingTemplate);
                setNamingEditorOpen(true);
              }}
            >
              <EditIcon /> Atualizar nomenclatura
            </button>
            {project.status === "active" && (
              <button type="button" className="btn btn-ghost" onClick={markCancelled}>
                Cancelar projeto
              </button>
            )}
            <button type="button" className={"btn" + (isDirty ? " btn-accent" : " btn-ghost saved-btn")} disabled={!isDirty} onClick={saveEdits}>
              {isDirty ? (
                "Salvar projeto"
              ) : (
                <>
                  <CheckIcon /> Salvo
                </>
              )}
            </button>
            {project.status === "active" ? (
              <button type="button" className="btn btn-ghost success-hover" onClick={markDone}>
                Concluir projeto
              </button>
            ) : (
              <button type="button" className="btn btn-ghost success-hover" onClick={reopen}>
                Reabrir projeto
              </button>
            )}
          </div>
        </div>

        <div className="diet-page-card">
          <span className="settings-label">Etapas</span>
          <div className="project-default-tags-row">
            <span className="hint-text" style={{ margin: 0 }}>
              Tags padrão das novas etapas:
            </span>
            <select
              value={project.defaultCategory ?? ""}
              onChange={(e) =>
                board.updateProject(project.id, { defaultCategory: (e.target.value || null) as Category | null })
              }
            >
              <option value="">Categoria (nenhuma)</option>
              {CATEGORIES.filter((c) => c !== "sem_categoria").map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <select
              value={project.defaultCategory2 ?? ""}
              onChange={(e) =>
                board.updateProject(project.id, { defaultCategory2: (e.target.value || null) as Category | null })
              }
            >
              <option value="">2ª categoria (nenhuma)</option>
              {CATEGORIES.filter((c) => c !== "sem_categoria" && c !== project.defaultCategory).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="task-list">
            <div className="quickadd-row">
              <span className="quickadd-plus" aria-hidden="true">
                +
              </span>
              <input
                type="text"
                className="quickadd-input"
                placeholder="+ Adicionar etapa e pressionar Enter"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStep()}
              />
            </div>
            {steps.length === 0 ? (
              <div className="empty-row">Nenhuma etapa vinculada ainda.</div>
            ) : (
              <div className="task-table-scroll">
                {steps.map((t, idx) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    draggable
                    dragging={draggingId === t.id}
                    position={idx + 1}
                    onDragStart={setDraggingId}
                    onDragOverRow={setOverId}
                    onDrop={handleStepDrop}
                    gridTemplate={stepGridTemplate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {namingEditorOpen &&
        createPortal(
          <>
            <div className="modal-backdrop" onClick={() => setNamingEditorOpen(false)} />
            <div className="modal-panel" role="dialog" aria-label="Nomenclatura das etapas">
              <div className="modal-title">Nomenclatura das etapas</div>
              <div className="hint-text">
                Use <code>{"{projeto}"}</code> pro nome do projeto e <code>{"{etapa}"}</code> pro número da etapa
                (01, 02...). Salvar aqui atualiza o padrão de toda etapa já criada — só a parte da descrição
                digitada depois do padrão é preservada.
              </div>
              <input
                type="text"
                autoFocus
                value={namingDraft}
                onChange={(e) => setNamingDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveNamingTemplate()}
              />
              <div className="edit-actions" style={{ marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setNamingEditorOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-accent" onClick={saveNamingTemplate}>
                  Salvar
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export function ProjectsView({
  onBack,
  selectedId,
  onSelect,
}: {
  onBack: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { board } = useBoardCtx();
  if (selectedId) {
    const project = board.state.projects.find((p) => p.id === selectedId);
    if (project) return <ProjectDetailView key={project.id} project={project} onBack={() => onSelect(null)} />;
  }
  return <ProjectListView onBack={onBack} onOpen={onSelect} />;
}
