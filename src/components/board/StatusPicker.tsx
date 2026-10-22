"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "./icons";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import type { TaskStatus } from "@/lib/types";

function StatusMenu({
  anchorRect,
  statuses,
  currentId,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  statuses: TaskStatus[];
  currentId: string | null;
  onSelect: (statusId: string) => void;
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
      {statuses.map((s) => (
        <button
          type="button"
          key={s.id}
          className={"status-menu-item" + (s.id === currentId ? " active" : "")}
          onClick={() => {
            onSelect(s.id);
            onClose();
          }}
        >
          <span className="status-menu-dot" style={{ background: s.color }} />
          {s.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

export function StatusPicker({
  statuses,
  currentId,
  onSelect,
}: {
  statuses: TaskStatus[];
  currentId: string | null;
  onSelect: (statusId: string) => void;
}) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = statuses.find((s) => s.id === currentId) ?? statuses[0];

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
        className={"status-pill" + (current?.isDone ? " done" : "")}
        style={{ "--status-color": current?.color ?? "var(--text-faint)" } as React.CSSProperties}
        title={current?.label ?? "Status"}
        onClick={toggleOpen}
      >
        {/* Mesmo controle e mesmo menu de antes; a bolinha agora vem com o nome do status. */}
        {current?.isDone ? (
          <span className="status-pill-check">
            <CheckIcon />
          </span>
        ) : (
          <span className="status-pill-dot" />
        )}
        <span className="status-pill-label">{current?.label ?? "Status"}</span>
      </button>
      {anchorRect && (
        <StatusMenu
          anchorRect={anchorRect}
          statuses={statuses}
          currentId={current?.id ?? null}
          onSelect={onSelect}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
  );
}
