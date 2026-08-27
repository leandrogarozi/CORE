"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { ClockIcon, TrashIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { fmtShortDate, isoAddDays, todayISO } from "@/lib/date-utils";
import type { Medication } from "@/lib/types";

function scheduleLabel(m: Medication): string | null {
  if (!m.time) return null;
  let label = m.time;
  if (m.startDate && m.durationDays) {
    const endISO = isoAddDays(m.startDate, m.durationDays - 1);
    const today = todayISO();
    if (today <= endISO) {
      label += ` · até ${fmtShortDate(endISO)}`;
    } else {
      label += " · encerrado";
    }
  }
  return label;
}

function MedicationScheduleButton({ medication }: { medication: Medication }) {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState(medication.time ?? "");
  const [durationDraft, setDurationDraft] = useState(medication.durationDays?.toString() ?? "");
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
      setTimeDraft(medication.time ?? "");
      setDurationDraft(medication.durationDays?.toString() ?? "");
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left });
      }
    }
    setOpen((v) => !v);
  }

  function save() {
    const duration = durationDraft ? parseInt(durationDraft, 10) || null : null;
    board.updateMedication(medication.id, {
      time: timeDraft || null,
      durationDays: duration,
      startDate: duration ? medication.startDate ?? todayISO() : null,
    });
    setOpen(false);
  }

  const label = scheduleLabel(medication);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"reminder-date-btn" + (medication.time ? " has-date" : "")}
        title={label ? `Horário: ${label}` : "Definir horário"}
        onClick={toggleOpen}
      >
        <ClockIcon />
        {label && <span>{label}</span>}
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="daylog-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <input
              type="time"
              autoFocus
              value={timeDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            />
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

function MedicationRow({ medication }: { medication: Medication }) {
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
      <MedicationScheduleButton medication={medication} />
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

export function MedicationsView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [newName, setNewName] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    board.addMedication(name);
    setNewName("");
  }

  const active = board.state.medications.filter((m) => m.active);
  const inactive = board.state.medications.filter((m) => !m.active);

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
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Adicionar medicamento e pressionar Enter"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
        </div>

        <div className="list-card">
          {active.length === 0 ? (
            <div className="hp-empty">Nenhum medicamento ativo.</div>
          ) : (
            active.map((m) => <MedicationRow key={m.id} medication={m} />)
          )}
        </div>

        {inactive.length > 0 && (
          <div className="list-card">
            {inactive.map((m) => (
              <MedicationRow key={m.id} medication={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
