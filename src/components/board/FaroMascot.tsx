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
    <svg viewBox="0 0 44 44" width="34" height="34" className="faro-dog">
      <rect x="6" y="2" width="6" height="16" rx="3" fill="currentColor" transform="rotate(-14 9 18)" />
      <rect x="32" y="2" width="6" height="16" rx="3" fill="currentColor" transform="rotate(14 35 18)" />
      <rect x="9" y="11" width="26" height="26" rx="9" fill="currentColor" />
      <circle className="faro-dog-light" cx="22" cy="7" r="1.8" fill="#FFD166" />
      <g className="faro-dog-eyes">
        <circle cx="17.5" cy="24.5" r="5.6" fill="#FFD166" />
        <circle cx="26.5" cy="24.5" r="5.6" fill="#FFD166" />
        <circle cx="15.7" cy="22.4" r="1.4" fill="#fff" opacity="0.85" />
        <circle cx="24.7" cy="22.4" r="1.4" fill="#fff" opacity="0.85" />
      </g>
      <path d="M15 31 Q22 36 29 31" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" fill="none" />
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
