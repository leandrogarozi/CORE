"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CommentIcon } from "./icons";

export function CommentButton({
  value,
  placeholder,
  onSave,
  ariaLabel,
}: {
  value: string | null;
  placeholder: string;
  onSave: (text: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) {
      setDraft(value ?? "");
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left });
      }
    }
    setOpen((v) => !v);
  }

  function save() {
    onSave(draft.trim());
    setOpen(false);
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
        <CommentIcon />
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="comment-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
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
                  setOpen(false);
                }
              }}
            />
            <div className="edit-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-accent" onClick={save}>
                Salvar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
