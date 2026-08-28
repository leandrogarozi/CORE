"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { PlayIcon } from "./icons";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";

const DURATIONS = [15, 30, 40, 60];

function durationLabel(min: number) {
  return min < 60 ? `${min}min` : "1h";
}

export function MeetingButton() {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);
  const open = anchorRect !== null;

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setAnchorRect(null);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      setAnchorRect(null);
      return;
    }
    setTitle("");
    setDuration(30);
    if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
  }

  function start() {
    board.startMeeting(title.trim() || "Reunião", duration);
    setAnchorRect(null);
  }

  return (
    <>
      <button ref={btnRef} type="button" className="reminders-btn" onClick={toggleOpen} title="Iniciar reunião">
        <PlayIcon />
        Reunião
      </button>
      {open &&
        createPortal(
          <div className="daylog-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <div className="edit-field">
              <span className="edit-field-label">Previsão de duração</span>
              <div className="note-options-chips">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={"note-chip" + (duration === d ? " active" : "")}
                    onClick={() => setDuration(d)}
                  >
                    {durationLabel(d)}
                  </button>
                ))}
              </div>
            </div>
            <div className="edit-field">
              <span className="edit-field-label">Nome da reunião</span>
              <input
                type="text"
                autoFocus
                placeholder="ex.: Reunião com Matheus"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") start();
                  else if (e.key === "Escape") setAnchorRect(null);
                }}
              />
            </div>
            <div className="edit-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAnchorRect(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-accent" onClick={start}>
                <PlayIcon /> Iniciar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
