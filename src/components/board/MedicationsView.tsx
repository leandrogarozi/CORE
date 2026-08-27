"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { CommentButton } from "./CommentButton";
import { ClockIcon, TrashIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { fmtShortDate, isoAddDays, todayISO } from "@/lib/date-utils";
import type { Medication, MedicationGroup } from "@/lib/types";

function scheduleLabel(time: string | null, showTime: boolean, startDate: string | null, durationDays: number | null): string | null {
  const parts: string[] = [];
  if (showTime && time) parts.push(time);
  if (startDate && durationDays) {
    const endISO = isoAddDays(startDate, durationDays - 1);
    parts.push(todayISO() <= endISO ? `até ${fmtShortDate(endISO)}` : "encerrado");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ScheduleButton({
  time,
  showTime,
  startDate,
  durationDays,
  title,
  onSave,
}: {
  time: string | null;
  showTime: boolean;
  startDate: string | null;
  durationDays: number | null;
  title: string;
  onSave: (patch: { time?: string | null; startDate: string | null; durationDays: number | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState(time ?? "");
  const [durationDraft, setDurationDraft] = useState(durationDays?.toString() ?? "");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) {
      setTimeDraft(time ?? "");
      setDurationDraft(durationDays?.toString() ?? "");
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left });
      }
    }
    setOpen((v) => !v);
  }

  function save() {
    const duration = durationDraft ? parseInt(durationDraft, 10) || null : null;
    onSave({
      ...(showTime ? { time: timeDraft || null } : {}),
      durationDays: duration,
      startDate: duration ? startDate ?? todayISO() : null,
    });
    setOpen(false);
  }

  const label = scheduleLabel(time, showTime, startDate, durationDays);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"reminder-date-btn" + (label ? " has-date" : "")}
        title={label ? `${title}: ${label}` : title}
        onClick={toggleOpen}
      >
        <ClockIcon />
        {label && <span>{label}</span>}
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="daylog-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            {showTime && (
              <input
                type="time"
                autoFocus
                value={timeDraft}
                onChange={(e) => setTimeDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              />
            )}
            <input
              type="number"
              min={1}
              placeholder="Duração em dias (opcional)"
              value={durationDraft}
              onChange={(e) => setDurationDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            />
            <div className="edit-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-accent" onClick={save}>
                Salvar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function MedicationRow({ medication, showTime }: { medication: Medication; showTime: boolean }) {
  const { board } = useBoardCtx();
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  function commitName() {
    if (nameDraft === null) return;
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== medication.name) board.updateMedication(medication.id, { name: trimmed });
    setNameDraft(null);
  }

  return (
    <div className={"reminder-row" + (!medication.active ? " done" : "")}>
      <ToggleSwitch
        checked={medication.active}
        onChange={(v) => board.updateMedication(medication.id, { active: v })}
        ariaLabel={medication.active ? "Desativar" : "Ativar"}
      />
      <input
        type="text"
        className="reminder-title-input"
        value={nameDraft ?? medication.name}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <CommentButton
        value={medication.notes}
        placeholder="Observação (dosagem, instruções...)"
        onSave={(text) => board.updateMedication(medication.id, { notes: text || null })}
        ariaLabel="Observação do remédio"
      />
      <ScheduleButton
        time={medication.time}
        showTime={showTime}
        startDate={medication.startDate}
        durationDays={medication.durationDays}
        title="Horário/duração do remédio"
        onSave={(patch) => board.updateMedication(medication.id, patch)}
      />
      <button
        className="icon-btn danger-hover"
        type="button"
        title="Excluir"
        onClick={() => board.deleteMedication(medication.id)}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function MedicationGroupCard({ group, medications }: { group: MedicationGroup; medications: Medication[] }) {
  const { board } = useBoardCtx();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [newMedName, setNewMedName] = useState("");

  function commitName() {
    if (nameDraft === null) return;
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== group.name) board.updateMedicationGroup(group.id, { name: trimmed });
    setNameDraft(null);
  }

  function handleAddMedication() {
    const name = newMedName.trim();
    if (!name) return;
    board.addMedication(name, group.id);
    setNewMedName("");
  }

  const showTime = group.timeMode === "individual";

  return (
    <div className={"list-card med-group-card" + (!group.active ? " inactive" : "")}>
      <div className="med-group-head">
        <ToggleSwitch
          checked={group.active}
          onChange={(v) => board.updateMedicationGroup(group.id, { active: v })}
          ariaLabel={group.active ? "Desativar tratamento" : "Ativar tratamento"}
        />
        <input
          type="text"
          className="reminder-title-input"
          value={nameDraft ?? group.name}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <CommentButton
          value={group.notes}
          placeholder="Observação do tratamento..."
          onSave={(text) => board.updateMedicationGroup(group.id, { notes: text || null })}
          ariaLabel="Observação do tratamento"
        />
        <div className="view-toggle" title="Horário único pro grupo, ou um horário por remédio">
          <button
            type="button"
            className={"view-toggle-btn" + (group.timeMode === "shared" ? " active" : "")}
            onClick={() => board.updateMedicationGroup(group.id, { timeMode: "shared" })}
          >
            Único
          </button>
          <button
            type="button"
            className={"view-toggle-btn" + (group.timeMode === "individual" ? " active" : "")}
            onClick={() => board.updateMedicationGroup(group.id, { timeMode: "individual" })}
          >
            Individual
          </button>
        </div>
        {group.timeMode === "shared" && (
          <ScheduleButton
            time={group.sharedTime}
            showTime
            startDate={group.startDate}
            durationDays={group.durationDays}
            title="Horário/duração do tratamento"
            onSave={(patch) =>
              board.updateMedicationGroup(group.id, {
                sharedTime: patch.time ?? null,
                startDate: patch.startDate,
                durationDays: patch.durationDays,
              })
            }
          />
        )}
        {group.timeMode === "individual" && (
          <ScheduleButton
            time={null}
            showTime={false}
            startDate={group.startDate}
            durationDays={group.durationDays}
            title="Duração do tratamento"
            onSave={(patch) => board.updateMedicationGroup(group.id, patch)}
          />
        )}
        <button
          className="icon-btn danger-hover"
          type="button"
          title="Excluir tratamento"
          onClick={() => board.deleteMedicationGroup(group.id)}
        >
          <TrashIcon />
        </button>
      </div>
      {medications.map((m) => (
        <MedicationRow key={m.id} medication={m} showTime={showTime} />
      ))}
      <div className="quickadd-row">
        <span className="quickadd-plus" aria-hidden="true">
          +
        </span>
        <input
          type="text"
          className="quickadd-input"
          placeholder="+ Adicionar remédio desse tratamento"
          value={newMedName}
          onChange={(e) => setNewMedName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddMedication()}
        />
      </div>
    </div>
  );
}

export function MedicationsView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [newGroupName, setNewGroupName] = useState("");
  const [newMedName, setNewMedName] = useState("");

  function handleAddGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    board.addMedicationGroup(name);
    setNewGroupName("");
  }

  function handleAddMedication() {
    const name = newMedName.trim();
    if (!name) return;
    board.addMedication(name, null);
    setNewMedName("");
  }

  const groups = board.state.medicationGroups;
  const recorrentes = board.state.medications.filter((m) => !m.groupId);

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Medicamentos</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list">
        <div className="section-head">
          <span className="section-pill accent">Temporários</span>
        </div>
        <div className="hint-text">
          Tratamentos com prazo (ex.: antibiótico) — cadastra o motivo, depois os remédios dentro dele.
        </div>
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Adicionar tratamento (ex.: Tratamento sinusite)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
            />
          </div>
        </div>
        {groups.length === 0 ? (
          <div className="list-card">
            <div className="hp-empty">Nenhum tratamento temporário cadastrado.</div>
          </div>
        ) : (
          groups.map((g) => (
            <MedicationGroupCard
              key={g.id}
              group={g}
              medications={board.state.medications.filter((m) => m.groupId === g.id)}
            />
          ))
        )}

        <div className="section-head" style={{ marginTop: 22 }}>
          <span className="section-pill accent">Recorrentes</span>
        </div>
        <div className="hint-text">Remédios de uso contínuo, sem prazo pra parar.</div>
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Adicionar medicamento recorrente"
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMedication()}
            />
          </div>
        </div>
        <div className="list-card">
          {recorrentes.length === 0 ? (
            <div className="hp-empty">Nenhum medicamento recorrente cadastrado.</div>
          ) : (
            recorrentes.map((m) => <MedicationRow key={m.id} medication={m} showTime />)
          )}
        </div>
      </div>
    </div>
  );
}
