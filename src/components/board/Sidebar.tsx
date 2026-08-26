"use client";

import { useEffect } from "react";
import { BellIcon, BookIcon, ChartIcon, HomeIcon, PillIcon, SettingsIcon, WeekIcon } from "./icons";

export type ViewMode = "day" | "week" | "dashboard" | "settings" | "books";

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
        </div>

        <div className="sidebar-section-label">Em breve</div>
        <div className="sidebar-section">
          <span className="sidebar-item disabled">
            <PillIcon /> Medicamentos
          </span>
          <span className="sidebar-item disabled">
            <BellIcon /> Lembretes
          </span>
        </div>

        <div className="sidebar-section sidebar-section-bottom">
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
