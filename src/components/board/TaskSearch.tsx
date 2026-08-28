"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { SearchIcon, TrashIcon } from "./icons";
import { fmtShortDate, longLabel } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { BOOK_STATUS_LABEL, type Book, type Reminder, type Task } from "@/lib/types";

export type SearchScope = "total" | "tasks" | "reminders" | "books" | "lixeira";

const SCOPES: { v: SearchScope; l: string }[] = [
  { v: "total", l: "Busca total" },
  { v: "tasks", l: "Tarefas" },
  { v: "reminders", l: "Lembretes" },
  { v: "books", l: "Livros" },
  { v: "lixeira", l: "Lixeira" },
];

export type SearchResult =
  | { kind: "task"; task: Task; subtitle: string }
  | { kind: "reminder"; reminder: Reminder; subtitle: string }
  | { kind: "book"; book: Book; subtitle: string }
  | { kind: "trash"; itemKind: "task" | "reminder"; id: string; title: string; subtitle: string };

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  task: "Tarefa",
  reminder: "Lembrete",
  book: "Livro",
  trash: "Excluída",
};

function snippet(text: string, q: string, max = 60): string {
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text.slice(0, max);
  const start = Math.max(0, idx - 15);
  const raw = text.slice(start, start + max);
  return (start > 0 ? "…" : "") + raw + (start + max < text.length ? "…" : "");
}

export function TaskSearch({ onNavigate }: { onNavigate: (result: SearchResult) => void }) {
  const { board, askConfirm } = useBoardCtx();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("total");
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);

  const q = query.trim().toLowerCase();
  const open = anchorRect !== null;
  const showResults = q !== "" || scope === "lixeira";

  const results: SearchResult[] = [];
  if (showResults) {
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
    if (scope === "lixeira") {
      for (const t of board.state.trashedTasks) {
        if (q && !t.title.toLowerCase().includes(q)) continue;
        results.push({
          kind: "trash",
          itemKind: "task",
          id: t.id,
          title: t.title,
          subtitle: t.deletedAt ? `excluída em ${fmtShortDate(t.deletedAt.slice(0, 10))}` : "",
        });
      }
      for (const r of board.state.trashedReminders) {
        if (q && !r.title.toLowerCase().includes(q)) continue;
        results.push({
          kind: "trash",
          itemKind: "reminder",
          id: r.id,
          title: r.title,
          subtitle: r.deletedAt ? `excluído em ${fmtShortDate(r.deletedAt.slice(0, 10))}` : "",
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

  function selectScope(next: SearchScope) {
    setScope(next);
    updatePos();
  }

  function restore(r: Extract<SearchResult, { kind: "trash" }>) {
    if (r.itemKind === "task") board.restoreTask(r.id);
    else board.restoreReminder(r.id);
  }

  function purge(r: Extract<SearchResult, { kind: "trash" }>) {
    askConfirm(`Excluir "${r.title}" de vez? Essa ação não pode ser desfeita.`, () => {
      if (r.itemKind === "task") board.purgeTask(r.id);
      else board.purgeReminder(r.id);
    });
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
        onFocus={updatePos}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAnchorRect(null);
          else if (e.key === "Enter" && limitedResults[0] && limitedResults[0].kind !== "trash") select(limitedResults[0]);
        }}
      />
      {open &&
        createPortal(
          <div
            className="search-popover"
            ref={popRef}
            style={{ top: pos.top, left: pos.left, width: Math.max(anchorRect?.width ?? 0, 280) }}
          >
            <select className="search-scope-select" value={scope} onChange={(e) => selectScope(e.target.value as SearchScope)}>
              {SCOPES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
            {!showResults && <div className="search-empty">Digite pra buscar...</div>}
            {showResults && limitedResults.length === 0 && (
              <div className="search-empty">{scope === "lixeira" ? "Lixeira vazia." : "Nada encontrado."}</div>
            )}
            {limitedResults.map((r) => {
              if (r.kind === "trash") {
                return (
                  <div key={`trash-${r.itemKind}-${r.id}`} className="search-result search-result-trash">
                    <span className="search-result-kind">{r.itemKind === "task" ? "Excluída" : "Excluído"}</span>
                    <span className="search-result-title">{r.title}</span>
                    <span className="search-result-date">{r.subtitle}</span>
                    <span className="search-result-trash-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => restore(r)}>
                        Restaurar
                      </button>
                      <button type="button" className="icon-btn danger-hover" title="Excluir de vez" onClick={() => purge(r)}>
                        <TrashIcon />
                      </button>
                    </span>
                  </div>
                );
              }
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
