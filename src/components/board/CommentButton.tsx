"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CommentIcon, ExpandIcon } from "./icons";
import { RichTextEditor } from "./RichTextEditor";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { stripHtml } from "@/lib/rich-text";

function CommentPopover({
  anchorRect,
  initialValue,
  placeholder,
  onSave,
  onClose,
  onExpand,
}: {
  anchorRect: DOMRect;
  initialValue: string;
  placeholder: string;
  onSave: (text: string) => void;
  onClose: () => void;
  onExpand: () => void;
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
    onSave(draft.trim());
  }

  return createPortal(
    <div className="comment-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
      <div className="comment-popover-head">
        <button type="button" className="icon-btn" title="Expandir pra editar melhor" onClick={onExpand}>
          <ExpandIcon />
        </button>
      </div>
      <textarea
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            onClose();
          }
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

function CommentModal({
  initialValue,
  placeholder,
  title,
  onSave,
  onClose,
}: {
  initialValue: string;
  placeholder: string;
  title: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  function save() {
    onSave(draft);
  }

  // Auto-save a cada 30s pra não perder texto se fechar sem clicar em Salvar.
  useEffect(() => {
    const id = setInterval(() => onSave(draftRef.current), 30000);
    return () => clearInterval(id);
  }, [onSave]);

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel comment-sheet" role="dialog" aria-label={title}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
        </div>
        <RichTextEditor value={draft} onChange={setDraft} placeholder={placeholder} autoFocus />
        <div className="edit-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" onClick={save}>
            Salvar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export function CommentButton({
  value,
  placeholder,
  onSave,
  ariaLabel,
  icon,
  title,
  variant = "icon",
  alwaysExpanded = false,
}: {
  value: string | null;
  placeholder: string;
  onSave: (text: string) => void;
  ariaLabel: string;
  icon?: ReactNode;
  title?: string;
  variant?: "icon" | "field";
  alwaysExpanded?: boolean; // pula o popover pequeno e abre direto no modal grande
}) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [expanded, setExpanded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const preview = stripHtml(value ?? "");

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (alwaysExpanded) {
      setExpanded(true);
      return;
    }
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
        className={
          (variant === "field" ? "comment-field-btn" : "comment-btn") + (value ? " has-comment" : "")
        }
        aria-label={ariaLabel}
        title={preview || ariaLabel}
        onClick={toggleOpen}
      >
        {icon ?? <CommentIcon />}
        {variant === "field" && <span className="comment-field-preview">{preview || placeholder}</span>}
      </button>
      {anchorRect && (
        <CommentPopover
          anchorRect={anchorRect}
          initialValue={preview}
          placeholder={placeholder}
          onSave={(text) => {
            onSave(text);
            setAnchorRect(null);
          }}
          onClose={() => setAnchorRect(null)}
          onExpand={() => {
            setAnchorRect(null);
            setExpanded(true);
          }}
        />
      )}
      {expanded && (
        <CommentModal
          initialValue={value ?? ""}
          placeholder={placeholder}
          title={title ?? ariaLabel}
          onSave={(text) => {
            onSave(text);
            setExpanded(false);
          }}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
