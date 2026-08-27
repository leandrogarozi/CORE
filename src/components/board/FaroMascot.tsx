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
    <svg viewBox="0 0 44 48" width="34" height="34" className="faro-dog">
      <path className="faro-dog-tail" d="M31 30 Q39 26 37 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="22" cy="33" rx="11" ry="8" fill="currentColor" />
      <ellipse cx="16.5" cy="40" rx="3" ry="2.2" fill="currentColor" />
      <ellipse cx="27.5" cy="40" rx="3" ry="2.2" fill="currentColor" />
      <ellipse cx="9.5" cy="13" rx="4.3" ry="7" fill="currentColor" transform="rotate(-25 9.5 13)" />
      <ellipse cx="34.5" cy="13" rx="4.3" ry="7" fill="currentColor" transform="rotate(25 34.5 13)" />
      <circle cx="22" cy="19" r="13" fill="currentColor" />
      <line x1="22" y1="7" x2="22" y2="1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle className="faro-dog-light" cx="22" cy="1" r="2.3" fill="#FFD166" />
      <g className="faro-dog-eyes">
        <circle cx="17" cy="18" r="2.1" fill="var(--accent)" />
        <circle cx="27" cy="18" r="2.1" fill="var(--accent)" />
      </g>
      <rect x="20" y="23" width="4" height="3" rx="1.3" fill="var(--accent)" />
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
