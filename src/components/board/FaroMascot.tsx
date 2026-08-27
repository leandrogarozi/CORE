"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { todayISO } from "@/lib/date-utils";

function greetingMessage(mood: number | null | undefined): string {
  if (mood === 0) return "Melhoras, Leandro! Espero que fique bem logo. 🤒";
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia, Leandro! ☀️";
  if (hour < 18) return "Boa tarde, Leandro!";
  return "Boa noite, Leandro!";
}

function FaroDogIcon() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" className="faro-dog">
      <path d="M11 13 L4 2 L14 8 Z" fill="currentColor" />
      <path d="M29 13 L36 2 L26 8 Z" fill="currentColor" />
      <circle className="faro-dog-light" cx="5" cy="2.5" r="2" fill="#FFD166" />
      <circle className="faro-dog-light" cx="35" cy="2.5" r="2" fill="#FFD166" />
      <rect x="6" y="10" width="28" height="23" rx="10" fill="currentColor" />
      <g className="faro-dog-eyes">
        <circle cx="15" cy="21.5" r="4.4" fill="#FFD166" />
        <circle cx="25" cy="21.5" r="4.4" fill="#FFD166" />
      </g>
      <rect x="17" y="28" width="6" height="2.2" rx="1.1" fill="var(--accent)" />
    </svg>
  );
}

export function FaroMascot() {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const mood = board.state.dailyLogs[today]?.mood;

  useEffect(() => {
    if (board.loading) return;
    const key = `faro-greeted-${today}`;
    if (!localStorage.getItem(key)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time greeting on first load of the day
      setOpen(true);
      localStorage.setItem(key, "1");
    }
  }, [board.loading, today]);

  return (
    <div className="faro-mascot">
      {open && (
        <div className="faro-bubble">
          <button className="faro-bubble-close" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
            ×
          </button>
          <div className="faro-bubble-text">{greetingMessage(mood)}</div>
          <div className="faro-bubble-hint">Em breve você vai poder me perguntar qualquer coisa por aqui.</div>
        </div>
      )}
      <button
        type="button"
        className="faro-avatar"
        aria-label="FARO"
        title="FARO"
        onClick={() => setOpen((v) => !v)}
      >
        <FaroDogIcon />
      </button>
    </div>
  );
}
