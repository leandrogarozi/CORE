"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { ChevronIcon, CommentIcon, TrashIcon } from "./icons";
import { BOOK_STATUS_COLOR, BOOK_STATUS_LABEL, BOOK_STATUS_ORDER, type Book, type BookStatus } from "@/lib/types";

function BookStatusPicker({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="book-status-pill"
        style={{ "--pill-color": BOOK_STATUS_COLOR[book.status] } as React.CSSProperties}
        onClick={toggleOpen}
      >
        <span className="book-status-dot" />
        {BOOK_STATUS_LABEL[book.status]}
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="status-menu" ref={menuRef} style={{ top: pos.top, left: pos.left }}>
            {BOOK_STATUS_ORDER.map((s) => (
              <button
                type="button"
                key={s}
                className={"status-menu-item" + (s === book.status ? " active" : "")}
                onClick={() => {
                  board.updateBook(book.id, { status: s });
                  setOpen(false);
                }}
              >
                <span className="status-menu-dot" style={{ background: BOOK_STATUS_COLOR[s] }} />
                {BOOK_STATUS_LABEL[s]}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

function BookInsightsButton({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(book.insights ?? "");

  function openSheet(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(book.insights ?? "");
    setOpen(true);
  }

  function save() {
    board.updateBook(book.id, { insights: draft.trim() || null });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={"comment-btn" + (book.insights ? " has-comment" : "")}
        aria-label="Resumo e insights do livro"
        title={book.insights || "Resumo / insights"}
        onClick={openSheet}
      >
        <CommentIcon />
      </button>
      {open &&
        createPortal(
          <>
            <div className="modal-backdrop" onClick={() => setOpen(false)} />
            <div className="modal-panel book-sheet" role="dialog" aria-label={`Resumo de ${book.title}`}>
              <div className="modal-head">
                <span className="modal-title">{book.title}</span>
              </div>
              <div className="hint-text">Resumo, trechos marcantes, insights — o que quiser guardar sobre esse livro.</div>
              <textarea
                autoFocus
                className="book-sheet-textarea"
                value={draft}
                placeholder="Escreva aqui..."
                onChange={(e) => setDraft(e.target.value)}
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
            </div>
          </>,
          document.body
        )}
    </>
  );
}

function BookRow({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== book.title) board.updateBook(book.id, { title: trimmed });
    setTitleDraft(null);
  }

  return (
    <div className="book-row">
      <input
        type="text"
        className="book-title-input"
        value={titleDraft ?? book.title}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <BookStatusPicker book={book} />
      <BookInsightsButton book={book} />
      <button
        className="icon-btn danger-hover"
        type="button"
        title="Excluir"
        onClick={() => board.deleteBook(book.id)}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function BooksView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [newTitle, setNewTitle] = useState("");
  const [collapsed, setCollapsed] = useState<Partial<Record<BookStatus, boolean>>>({});

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addBook(title);
    setNewTitle("");
  }

  function toggleGroup(status: BookStatus) {
    setCollapsed((c) => ({ ...c, [status]: !c[status] }));
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Livros</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="books-container">
        <div className="task-list">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Adicionar livro e pressionar Enter"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>

          {BOOK_STATUS_ORDER.map((status) => {
            const books = board.state.books.filter((b) => b.status === status);
            const isCollapsed = !!collapsed[status];
            return (
              <div key={status}>
                <button type="button" className="book-group-head" onClick={() => toggleGroup(status)}>
                  <span className={"chevron" + (isCollapsed ? " collapsed" : "")}>
                    <ChevronIcon />
                  </span>
                  <span
                    className="book-group-pill"
                    style={{ "--group-color": BOOK_STATUS_COLOR[status] } as React.CSSProperties}
                  >
                    {BOOK_STATUS_LABEL[status].toUpperCase()}
                    <span className="count">{books.length}</span>
                  </span>
                </button>
                {!isCollapsed && books.map((b) => <BookRow key={b.id} book={b} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
