"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { PauseIcon, PlayIcon } from "./icons";
import { fmtClock } from "@/lib/date-utils";
import { taskSecondsOnDay } from "@/lib/board/task-time";
import type { ActiveTimer, BoardState, RecurringItem, Task, TimerKind } from "@/lib/types";

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

// O relógio ao vivo mostra o tempo DO DIA, não o acumulado da tarefa inteira:
// a pergunta enquanto se trabalha é "quanto já fiz nisso hoje". Hábitos e blocos
// já funcionavam assim; a tarefa passou a funcionar igual.
function baseTrackedSeconds(
  state: BoardState,
  item: Task | RecurringItem | undefined,
  kind: TimerKind,
  logDate: string
): number {
  if (!item) return 0;
  if (kind === "task") return taskSecondsOnDay(state, (item as Task).id, logDate);
  return (item as RecurringItem).logs[logDate]?.trackedSeconds ?? 0;
}

export function TimerButton({ kind, id, logDate }: { kind: TimerKind; id: string; logDate: string }) {
  const { board } = useBoardCtx();
  const at = board.state.activeTimers.find((t) => t.kind === kind && t.itemId === id);
  const running = !!at;
  const item = board.findTrackable(kind, id);
  const sessionElapsed = useElapsedSeconds(at?.startedAt);
  const totalElapsed = baseTrackedSeconds(board.state, item, kind, logDate) + sessionElapsed;

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
      {running && <span className="timer-live mono">{fmtClock(totalElapsed)}</span>}
    </span>
  );
}

function ActiveTimerBadgeItem({ at }: { at: ActiveTimer }) {
  const { board } = useBoardCtx();
  const sessionElapsed = useElapsedSeconds(at.startedAt);
  const item = board.findTrackable(at.kind, at.itemId);
  const label = item ? ("title" in item ? item.title : item.name) : at.kind === "task" ? "Tarefa" : at.kind === "habit" ? "Hábito" : "Bloco fixo";
  const totalElapsed = baseTrackedSeconds(board.state, item, at.kind, at.logDate) + sessionElapsed;

  return (
    <div className="active-timer-badge">
      <span className="timer-live mono">{fmtClock(totalElapsed)}</span>
      <span className="badge-name">{label}</span>
      <button type="button" title="Pausar" onClick={() => board.toggleTimer(at.kind, at.itemId, at.logDate)}>
        <PauseIcon />
      </button>
    </div>
  );
}

export function ActiveTimerBadge() {
  const { board } = useBoardCtx();
  const activeTimers = board.state.activeTimers;

  if (activeTimers.length === 0) return null;

  return (
    <div className="active-timer-badges">
      {activeTimers.map((at) => (
        <ActiveTimerBadgeItem key={at.id} at={at} />
      ))}
    </div>
  );
}
