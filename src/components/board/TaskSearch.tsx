"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { SearchIcon } from "./icons";
import { longLabel } from "@/lib/date-utils";
import type { Task } from "@/lib/types";

export function TaskSearch({ onNavigate }: { onNavigate: (task: Task) => void }) {
  const { board } = useBoardCtx();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const results = q ? board.state.tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8) : [];

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || inputRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function updatePos() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }

  function select(task: Task) {
    onNavigate(task);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="topbar-search">
      <SearchIcon />
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar tarefas..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          updatePos();
          setOpen(true);
        }}
        onFocus={() => {
          updatePos();
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "Enter" && results[0]) select(results[0]);
        }}
      />
      {open &&
        pos &&
        q &&
        createPortal(
          <div
            className="search-popover"
            ref={popRef}
            style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 260) }}
          >
            {results.length === 0 && <div className="search-empty">Nenhuma tarefa encontrada.</div>}
            {results.map((t) => (
              <button type="button" key={t.id} className="search-result" onClick={() => select(t)}>
                <span className="search-result-title">{t.title}</span>
                <span className="search-result-date">{t.date ? longLabel(t.date) : "Sem data"}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
