"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { CommentButton } from "./CommentButton";
import { TrashIcon } from "./icons";
import { BOOK_STATUS_LABEL, type Book, type BookStatus } from "@/lib/types";

const STATUSES: BookStatus[] = ["para_ler", "lendo", "finalizado"];

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
      <select
        className="book-status-select"
        value={book.status}
        onChange={(e) => board.updateBook(book.id, { status: e.target.value as BookStatus })}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {BOOK_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <CommentButton
        value={book.insights}
        placeholder="Resumo / insights (opcional)"
        ariaLabel="Resumo e insights do livro"
        onSave={(text) => board.updateBook(book.id, { insights: text || null })}
      />
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

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addBook(title);
    setNewTitle("");
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

      <div className="section task-list">
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
      </div>

      {STATUSES.map((status) => {
        const books = board.state.books.filter((b) => b.status === status);
        return (
          <div className="section" key={status}>
            <div className="section-head">
              <span className="section-pill">
                {BOOK_STATUS_LABEL[status]}
                <span className="count">{books.length}</span>
              </span>
            </div>
            <div className="task-list">
              {!books.length && <div className="empty-row">Nenhum livro aqui.</div>}
              {books.map((b) => (
                <BookRow key={b.id} book={b} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
