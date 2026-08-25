"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { PauseIcon, PlayIcon } from "./icons";
import { fmtClock } from "@/lib/date-utils";
import type { TimerKind } from "@/lib/types";

function useElapsedSeconds(startedAt: number | undefined) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (startedAt == null) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    const h = setInterval(update, 1000);
    const raf = requestAnimationFrame(update);
    return () => {
      clearInterval(h);
      cancelAnimationFrame(raf);
    };
  }, [startedAt]);
  return elapsed;
}

export function TimerButton({ kind, id, logDate }: { kind: TimerKind; id: string; logDate: string }) {
  const { board } = useBoardCtx();
  const running = board.isTimerRunning(kind, id);
  const elapsed = useElapsedSeconds(running ? board.state.activeTimer?.startedAt : undefined);

  return (
    <span className="timer-wrap">
      <button
        type="button"
        className={"icon-btn timer-btn" + (running ? " running" : "")}
        title={running ? "Pausar cronômetro" : "Iniciar cronômetro"}
        onClick={(e) => {
          e.stopPropagation();
          board.toggleTimer(kind, id, logDate);
        }}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
      </button>
      {running && <span className="timer-live mono">{fmtClock(elapsed)}</span>}
    </span>
  );
}

export function ActiveTimerBadge() {
  const { board } = useBoardCtx();
  const at = board.state.activeTimer;
  const elapsed = useElapsedSeconds(at?.startedAt);

  if (!at) return null;
  const item = board.findTrackable(at.kind, at.itemId);
  const label = item ? ("title" in item ? item.title : item.name) : at.kind === "task" ? "Tarefa" : at.kind === "habit" ? "Hábito" : "Bloco fixo";

  return (
    <div className="active-timer-badge">
      <span className="timer-live mono">{fmtClock(elapsed)}</span>
      <span className="badge-name">{label}</span>
      <button type="button" title="Pausar" onClick={() => board.toggleTimer(at.kind, at.itemId, at.logDate)}>
        <PauseIcon />
      </button>
    </div>
  );
}
