"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useBoardCtx } from "./board-context";
import { todayISO } from "@/lib/date-utils";

function greetingMessage(mood: number | null | undefined): string {
  if (mood === 0) return "Melhoras, Leandro! Espero que fique bem logo. 🤒";
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia, Leandro! ☀️";
  if (hour < 18) return "Boa tarde, Leandro!";
  return "Boa noite, Leandro!";
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
        <Image
          src="/faro-dog.png"
          alt=""
          fill
          sizes="64px"
          priority
          style={{ objectFit: "cover", objectPosition: "50% 32%" }}
        />
      </button>
    </div>
  );
}
