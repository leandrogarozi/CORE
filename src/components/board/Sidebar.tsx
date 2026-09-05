"use client";

import { useEffect } from "react";
import { BellIcon, BoltIcon, BookIcon, ChartIcon, ChecklistIcon, FolderIcon, HomeIcon, MealIcon, PillIcon, SettingsIcon, TrashIcon, UsersGroupIcon, WeekIcon } from "./icons";

export type ViewMode =
  | "day"
  | "week"
  | "dashboard"
  | "settings"
  | "profile"
  | "books"
  | "calendar"
  | "reminders"
  | "synapses"
  | "medications"
  | "checklists"
  | "diet"
  | "projects"
  | "meetings"
  | "trash";

export function Sidebar({
  open,
  viewMode,
  onSelect,
  onClose,
}: {
  open: boolean;
  viewMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div className={"sidebar-backdrop" + (open ? " open" : "")} onClick={onClose} aria-hidden="true" />
      <nav className={"sidebar" + (open ? " open" : "")} aria-label="Menu principal">
        <div className="sidebar-brand">FARO</div>

        <div className="sidebar-section">
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "day" ? " active" : "")}
            onClick={() => onSelect("day")}
          >
            <HomeIcon /> Painel
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "week" ? " active" : "")}
            onClick={() => onSelect("week")}
          >
            <WeekIcon /> Semana
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "dashboard" ? " active" : "")}
            onClick={() => onSelect("dashboard")}
          >
            <ChartIcon /> Dashboard
          </button>
        </div>

        <div className="sidebar-section">
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "books" ? " active" : "")}
            onClick={() => onSelect("books")}
          >
            <BookIcon /> Livros
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "reminders" ? " active" : "")}
            onClick={() => onSelect("reminders")}
          >
            <BellIcon /> Lembretes
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "synapses" ? " active" : "")}
            onClick={() => onSelect("synapses")}
          >
            <BoltIcon /> Novas Sinapses
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "medications" ? " active" : "")}
            onClick={() => onSelect("medications")}
          >
            <PillIcon /> Medicamentos
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "checklists" ? " active" : "")}
            onClick={() => onSelect("checklists")}
          >
            <ChecklistIcon /> Checklists
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "diet" ? " active" : "")}
            onClick={() => onSelect("diet")}
          >
            <MealIcon /> Dieta
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "projects" ? " active" : "")}
            onClick={() => onSelect("projects")}
          >
            <FolderIcon /> Projetos
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "meetings" ? " active" : "")}
            onClick={() => onSelect("meetings")}
          >
            <UsersGroupIcon /> Reuniões
          </button>
        </div>

        <div className="sidebar-section sidebar-section-bottom">
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "trash" ? " active" : "")}
            onClick={() => onSelect("trash")}
          >
            <TrashIcon /> Lixeira
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "settings" ? " active" : "")}
            onClick={() => onSelect("settings")}
          >
            <SettingsIcon /> Configurações
          </button>
        </div>
      </nav>
    </>
  );
}
