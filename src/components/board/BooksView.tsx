"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { BookIcon, BookmarkIcon, BookOpenIcon, ChevronIcon, CommentIcon, DragGripIcon, FlagIcon, TrashIcon, WeekIcon } from "./icons";
import { RichTextEditor } from "./RichTextEditor";
import { priorityColor, priorityLabel, nextPriority } from "./TaskRow";
import { fmtShortDate } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { stripHtml } from "@/lib/rich-text";
import {
  BOOK_GROUP_LABEL,
  BOOK_STATUS_COLOR,
  BOOK_STATUS_LABEL,
  BOOK_STATUS_ORDER,
  type Book,
  type BookStatus,
} from "@/lib/types";

const BOOK_STATUS_ICON: Record<BookStatus, () => React.JSX.Element> = {
  para_ler: BookmarkIcon,
  lendo: BookOpenIcon,
  finalizado: BookIcon,
};

function BookStartDatePopover({
  anchorRect,
  initialValue,
  onSave,
  onClose,
}: {
  anchorRect: DOMRect;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onClose]);

  function save() {
    onSave(draft);
  }

  return createPortal(
    <div className="daylog-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
      <input
        type="date"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") onClose();
        }}
      />
      <div className="edit-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-accent" onClick={save}>
          Salvar
        </button>
      </div>
    </div>,
    document.body
  );
}

function BookStartDateButton({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (anchorRect) {
      setAnchorRect(null);
    } else if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"book-date-btn" + (book.startedAt ? " has-date" : "")}
        title={book.startedAt ? `Início: ${fmtShortDate(book.startedAt)}` : "Definir data de início"}
        onClick={toggleOpen}
      >
        <WeekIcon />
        {book.startedAt && <span>{fmtShortDate(book.startedAt)}</span>}
      </button>
      {anchorRect && (
        <BookStartDatePopover
          anchorRect={anchorRect}
          initialValue={book.startedAt ?? ""}
          onSave={(value) => {
            board.updateBook(book.id, { startedAt: value || null });
            setAnchorRect(null);
          }}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
  );
}

function BookStatusMenu({
  anchorRect,
  currentStatus,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  currentStatus: BookStatus;
  onSelect: (status: BookStatus) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onClose]);

  return createPortal(
    <div className="status-menu" ref={ref} style={{ top: pos.top, left: pos.left }}>
      {BOOK_STATUS_ORDER.map((s) => (
        <button
          type="button"
          key={s}
          className={"status-menu-item" + (s === currentStatus ? " active" : "")}
          onClick={() => onSelect(s)}
        >
          <span className="status-menu-dot" style={{ background: BOOK_STATUS_COLOR[s] }} />
          {BOOK_STATUS_LABEL[s]}
        </button>
      ))}
    </div>,
    document.body
  );
}

function BookStatusPicker({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (anchorRect) {
      setAnchorRect(null);
    } else if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="book-status-dot"
        style={{ "--pill-color": BOOK_STATUS_COLOR[book.status] } as React.CSSProperties}
        title={BOOK_STATUS_LABEL[book.status]}
        onClick={toggleOpen}
      />
      {anchorRect && (
        <BookStatusMenu
          anchorRect={anchorRect}
          currentStatus={book.status}
          onSelect={(status) => {
            board.updateBook(book.id, { status });
            setAnchorRect(null);
          }}
          onClose={() => setAnchorRect(null)}
        />
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
    board.updateBook(book.id, { insights: draft || null });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={"comment-btn" + (book.insights ? " has-comment" : "")}
        aria-label="Resumo e insights do livro"
        title={stripHtml(book.insights ?? "") || "Resumo / insights"}
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
              <RichTextEditor value={draft} onChange={setDraft} placeholder="Escreva aqui..." autoFocus />
              <div className="edit-actions" style={{ marginTop: 10 }}>
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

function BookPriorityFlag({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  return (
    <button
      type="button"
      className="flag flag-btn"
      title={`${priorityLabel(book.priority)} — clique pra mudar`}
      onClick={(e) => {
        e.stopPropagation();
        board.updateBook(book.id, { priority: nextPriority(book.priority) });
      }}
    >
      <FlagIcon color={priorityColor(book.priority)} />
    </button>
  );
}

function BookRow({
  book,
  draggable,
  dragging,
  position,
  onDragStart,
  onDragOverRow,
  onDrop,
}: {
  book: Book;
  draggable?: boolean;
  dragging?: boolean;
  position?: number;
  onDragStart?: (id: string) => void;
  onDragOverRow?: (id: string) => void;
  onDrop?: () => void;
}) {
  const { board } = useBoardCtx();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== book.title) board.updateBook(book.id, { title: trimmed });
    setTitleDraft(null);
  }

  return (
    <div
      className={"book-row" + (dragging ? " dragging" : "")}
      draggable={draggable}
      onDragStart={() => onDragStart?.(book.id)}
      onDragOver={(e) => {
        if (!draggable) return;
        e.preventDefault();
        onDragOverRow?.(book.id);
      }}
      onDrop={(e) => {
        if (!draggable) return;
        e.preventDefault();
        onDrop?.();
      }}
    >
      {draggable && (
        <span className="book-row-order" title="Arraste pra reordenar a fila de leitura">
          <DragGripIcon />
          <span className="book-row-order-num mono">{position}</span>
        </span>
      )}
      <input
        type="text"
        className="book-title-input"
        value={titleDraft ?? book.title}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      {book.status === "lendo" && <BookStartDateButton book={book} />}
      <BookPriorityFlag book={book} />
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addBook(title);
    setNewTitle("");
  }

  function toggleGroup(status: BookStatus) {
    setCollapsed((c) => ({ ...c, [status]: !c[status] }));
  }

  function handleDrop(books: Book[]) {
    if (!draggingId) return;
    const ids = books.map((b) => b.id);
    const fromIdx = ids.indexOf(draggingId);
    let toIdx = overId ? ids.indexOf(overId) : ids.length - 1;
    if (fromIdx === -1) return;
    if (toIdx === -1) toIdx = ids.length - 1;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggingId);
    board.reorderBooks(ids);
    setDraggingId(null);
    setOverId(null);
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

      <div className="narrow-list">
        <div className="list-quickadd-card">
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

        {BOOK_STATUS_ORDER.map((status) => {
          const books = board.state.books
            .filter((b) => b.status === status)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          const isCollapsed = !!collapsed[status];
          const hasRows = !isCollapsed && books.length > 0;
          const GroupIcon = BOOK_STATUS_ICON[status];
          const draggable = status === "para_ler";
          return (
            <div key={status} className="list-card">
              <button
                type="button"
                className={"book-group-head" + (hasRows ? " has-rows" : "")}
                onClick={() => toggleGroup(status)}
              >
                <span className={"chevron" + (isCollapsed ? " collapsed" : "")}>
                  <ChevronIcon />
                </span>
                <span
                  className="book-group-tag"
                  style={{ "--group-color": BOOK_STATUS_COLOR[status] } as React.CSSProperties}
                >
                  <GroupIcon />
                  <span className="book-group-name">{BOOK_GROUP_LABEL[status]}</span>
                </span>
                <span className="book-group-count">{books.length}</span>
              </button>
              {!isCollapsed &&
                books.map((b, idx) => (
                  <BookRow
                    key={b.id}
                    book={b}
                    draggable={draggable}
                    dragging={draggingId === b.id}
                    position={idx + 1}
                    onDragStart={draggable ? setDraggingId : undefined}
                    onDragOverRow={draggable ? setOverId : undefined}
                    onDrop={draggable ? () => handleDrop(books) : undefined}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
