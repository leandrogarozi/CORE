"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "./icons";
import type { TaskStatus } from "@/lib/types";

export function StatusPicker({
  statuses,
  currentId,
  onSelect,
}: {
  statuses: TaskStatus[];
  currentId: string | null;
  onSelect: (statusId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = statuses.find((s) => s.id === currentId) ?? statuses[0];

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
        className={"status-dot" + (current?.isDone ? " done" : "")}
        style={{ "--status-color": current?.color ?? "var(--text-faint)" } as React.CSSProperties}
        title={current?.label ?? "Status"}
        onClick={toggleOpen}
      >
        {current?.isDone && <CheckIcon />}
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="status-menu" ref={menuRef} style={{ top: pos.top, left: pos.left }}>
            {statuses.map((s) => (
              <button
                type="button"
                key={s.id}
                className={"status-menu-item" + (s.id === current?.id ? " active" : "")}
                onClick={() => {
                  onSelect(s.id);
                  setOpen(false);
                }}
              >
                <span className="status-menu-dot" style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
