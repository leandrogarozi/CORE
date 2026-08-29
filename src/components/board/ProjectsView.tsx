"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { TaskRow } from "./TaskRow";
import { CheckCircleIcon, CheckIcon, ClockIcon, CloseCircleIcon, PlayCircleIcon } from "./icons";
import { fmtHM } from "@/lib/date-utils";
import type { Project } from "@/lib/types";

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
  const [newStepTitle, setNewStepTitle] = useState("");

  const steps = [...board.state.tasks]
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
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
    if (!title) return;
    board.addTaskToProject(project.id, title);
    setNewStepTitle("");
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

      <div className="narrow-list">
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
          </div>
          <textarea
            className="diet-plan-input"
            placeholder="Objetivo, notas sobre o plano..."
            value={descDraft ?? project.description}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={commitDesc}
            rows={3}
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
                {steps.map((t) => (
                  <TaskRow key={t.id} task={t} draggable={false} gridTemplate={columns.gridTemplate} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
    if (project) return <ProjectDetailView project={project} onBack={() => onSelect(null)} />;
  }
  return <ProjectListView onBack={onBack} onOpen={onSelect} />;
}
