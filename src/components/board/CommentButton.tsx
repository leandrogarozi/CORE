"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CommentIcon } from "./icons";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";

function CommentPopover({
  anchorRect,
  initialValue,
  placeholder,
  onSave,
  onClose,
}: {
  anchorRect: DOMRect;
  initialValue: string;
  placeholder: string;
  onSave: (text: string) => void;
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
    onSave(draft.trim());
  }

  return createPortal(
    <div className="comment-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
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

export function CommentButton({
  value,
  placeholder,
  onSave,
  ariaLabel,
  icon,
}: {
  value: string | null;
  placeholder: string;
  onSave: (text: string) => void;
  ariaLabel: string;
  icon?: ReactNode;
}) {
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
        />
      )}
    </>
  );
}
