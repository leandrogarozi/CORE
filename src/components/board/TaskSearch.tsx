"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { SearchIcon } from "./icons";
import { fmtShortDate, longLabel } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { BOOK_STATUS_LABEL, type Book, type Reminder, type Task } from "@/lib/types";

export type SearchScope = "total" | "tasks" | "reminders" | "books";

const SCOPES: { v: SearchScope; l: string }[] = [
  { v: "total", l: "Busca total" },
  { v: "tasks", l: "Tarefas" },
  { v: "reminders", l: "Lembretes" },
  { v: "books", l: "Livros" },
];

export type SearchResult =
  | { kind: "task"; task: Task; subtitle: string }
  | { kind: "reminder"; reminder: Reminder; subtitle: string }
  | { kind: "book"; book: Book; subtitle: string };

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  task: "Tarefa",
  reminder: "Lembrete",
  book: "Livro",
};

function snippet(text: string, q: string, max = 60): string {
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text.slice(0, max);
  const start = Math.max(0, idx - 15);
  const raw = text.slice(start, start + max);
  return (start > 0 ? "…" : "") + raw + (start + max < text.length ? "…" : "");
}

export function TaskSearch({ onNavigate }: { onNavigate: (result: SearchResult) => void }) {
  const { board } = useBoardCtx();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("total");
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);

  const q = query.trim().toLowerCase();
  const open = anchorRect !== null;

  const results: SearchResult[] = [];
  if (q) {
    if (scope === "total" || scope === "tasks") {
      for (const t of board.state.tasks) {
        const inTitle = t.title.toLowerCase().includes(q);
        const inNote = t.note.toLowerCase().includes(q);
        if (!inTitle && !inNote) continue;
        results.push({
          kind: "task",
          task: t,
          subtitle: inTitle ? (t.date ? longLabel(t.date) : "Sem data") : `nota: ${snippet(t.note, q)}`,
        });
      }
    }
    if (scope === "total" || scope === "reminders") {
      for (const r of board.state.reminders) {
        if (!r.title.toLowerCase().includes(q)) continue;
        results.push({ kind: "reminder", reminder: r, subtitle: r.date ? fmtShortDate(r.date) : "Sem data" });
      }
    }
    if (scope === "total" || scope === "books") {
      for (const b of board.state.books) {
        const inTitle = b.title.toLowerCase().includes(q);
        const inInsights = (b.insights ?? "").toLowerCase().includes(q);
        if (!inTitle && !inInsights) continue;
        results.push({
          kind: "book",
          book: b,
          subtitle: inTitle ? BOOK_STATUS_LABEL[b.status] : `nota: ${snippet(b.insights ?? "", q)}`,
        });
      }
    }
  }
  const limitedResults = results.slice(0, 10);

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

  function select(result: SearchResult) {
    onNavigate(result);
    setQuery("");
    setAnchorRect(null);
  }

  return (
    <div className="topbar-search">
      <SearchIcon />
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar em tudo..."
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
          else if (e.key === "Enter" && limitedResults[0]) select(limitedResults[0]);
        }}
      />
      {open &&
        q &&
        createPortal(
          <div
            className="search-popover"
            ref={popRef}
            style={{ top: pos.top, left: pos.left, width: Math.max(anchorRect?.width ?? 0, 280) }}
          >
            <select
              className="search-scope-select"
              value={scope}
              onChange={(e) => setScope(e.target.value as SearchScope)}
            >
              {SCOPES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
            {limitedResults.length === 0 && <div className="search-empty">Nada encontrado.</div>}
            {limitedResults.map((r) => {
              const key = r.kind === "task" ? r.task.id : r.kind === "reminder" ? r.reminder.id : r.book.id;
              const title = r.kind === "task" ? r.task.title : r.kind === "reminder" ? r.reminder.title : r.book.title;
              return (
                <button type="button" key={`${r.kind}-${key}`} className="search-result" onClick={() => select(r)}>
                  <span className="search-result-kind">{KIND_LABEL[r.kind]}</span>
                  <span className="search-result-title">{title}</span>
                  <span className="search-result-date">{r.subtitle}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
