"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { SearchIcon } from "./icons";
import { longLabel } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import type { Task } from "@/lib/types";

export function TaskSearch({ onNavigate }: { onNavigate: (task: Task) => void }) {
  const { board } = useBoardCtx();
  const [query, setQuery] = useState("");
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);

  const q = query.trim().toLowerCase();
  const open = anchorRect !== null;
  const results = q ? board.state.tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8) : [];

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || inputRef.current?.contains(e.target as Node)) return;
      setAnchorRect(null);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function updatePos() {
    if (inputRef.current) {
      setAnchorRect(inputRef.current.getBoundingClientRect());
    }
  }

  function select(task: Task) {
    onNavigate(task);
    setQuery("");
    setAnchorRect(null);
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
        }}
        onFocus={() => {
          if (query.trim()) updatePos();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAnchorRect(null);
          else if (e.key === "Enter" && results[0]) select(results[0]);
        }}
      />
      {open &&
        q &&
        createPortal(
          <div
            className="search-popover"
            ref={popRef}
            style={{ top: pos.top, left: pos.left, width: Math.max(anchorRect?.width ?? 0, 260) }}
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
