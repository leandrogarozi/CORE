"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CommentIcon, ExpandIcon } from "./icons";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";

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

  function save() {
    onSave(draft.trim());
  }

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel comment-sheet" role="dialog" aria-label={title}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
        </div>
        <textarea
          autoFocus
          className="comment-sheet-textarea"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        />
        <div className="edit-actions">
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
}: {
  value: string | null;
  placeholder: string;
  onSave: (text: string) => void;
  ariaLabel: string;
  icon?: ReactNode;
  title?: string;
}) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [expanded, setExpanded] = useState(false);
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
        className={"comment-btn" + (value ? " has-comment" : "")}
        aria-label={ariaLabel}
        title={value || ariaLabel}
        onClick={toggleOpen}
      >
        {icon ?? <CommentIcon />}
      </button>
      {anchorRect && (
        <CommentPopover
          anchorRect={anchorRect}
          initialValue={value ?? ""}
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
