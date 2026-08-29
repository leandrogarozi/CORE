"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { DragGripIcon } from "./icons";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// overflow-y:auto sozinho depende de wheel/touch nativos, que nem sempre respondem
// bem num popover em portal — arrastar com o ponteiro (mouse ou dedo) vira uma forma
// extra e mais óbvia de rolar, tipo um seletor de roleta.
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;
    let moved = false;
    let startY = 0;
    let startScroll = 0;

    function suppressClick(e: MouseEvent) {
      e.stopPropagation();
      e.preventDefault();
    }

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      moved = false;
      startY = e.clientY;
      startScroll = el!.scrollTop;
      el!.setPointerCapture(e.pointerId);
      el!.classList.add("dragging");
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 3) moved = true;
      el!.scrollTop = startScroll - dy;
    }

    function endDrag(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      el!.classList.remove("dragging");
      try {
        el!.releasePointerCapture(e.pointerId);
      } catch {
        // já liberado
      }
      if (moved) el!.addEventListener("click", suppressClick, { capture: true, once: true });
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
    };
  }, [ref]);
}

export function TimePicker({
  value,
  onChange,
  disabled,
  placeholder = "--:--",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);
  const open = anchorRect !== null;
  useDragScroll(hourListRef);
  useDragScroll(minuteListRef);

  const [h, m] = value ? value.split(":").map(Number) : [null, null];

  useEffect(() => {
    if (autoFocus && btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setAnchorRect(null);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const hourEl = hourListRef.current?.querySelector<HTMLElement>(`[data-v="${h ?? 0}"]`);
    hourEl?.scrollIntoView({ block: "center" });
    const minuteEl = minuteListRef.current?.querySelector<HTMLElement>(`[data-v="${m ?? 0}"]`);
    minuteEl?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    if (open) {
      setAnchorRect(null);
      return;
    }
    if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"time-picker-btn" + (className ? ` ${className}` : "")}
        disabled={disabled}
        onClick={toggleOpen}
      >
        {value || placeholder}
      </button>
      {open &&
        createPortal(
          <div className="time-picker-pop" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <div className="time-picker-col" ref={hourListRef}>
              {HOURS.map((hh) => (
                <button
                  key={hh}
                  type="button"
                  data-v={hh}
                  className={"time-picker-num" + (h === hh ? " selected" : "")}
                  onClick={() => onChange(`${pad(hh)}:${pad(m ?? 0)}`)}
                >
                  {pad(hh)}
                </button>
              ))}
            </div>
            <span className="time-picker-grip" aria-hidden="true">
              <DragGripIcon />
            </span>
            <div className="time-picker-col" ref={minuteListRef}>
              {MINUTES.map((mm) => (
                <button
                  key={mm}
                  type="button"
                  data-v={mm}
                  className={"time-picker-num" + (m === mm ? " selected" : "")}
                  onClick={() => onChange(`${pad(h ?? 0)}:${pad(mm)}`)}
                >
                  {pad(mm)}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Mesmo seletor de horas/minutos, mas pra duração (quantidade de tempo, ex.: 90min = 01:30)
// em vez de horário do relógio — converte de/pra minutos totais.
export function MinutesPicker({
  minutes,
  onChange,
  disabled,
  placeholder,
  className,
  autoFocus,
}: {
  minutes: number | null;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <TimePicker
      value={minutes != null ? `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}` : ""}
      onChange={(v) => {
        const [h, m] = v.split(":").map(Number);
        onChange(h * 60 + m);
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
    />
  );
}
