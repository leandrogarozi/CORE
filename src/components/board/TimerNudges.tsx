"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { BellIcon, CheckIcon, PlayIcon, SendIcon } from "./icons";
import { fmtTempoCurto, todayISO } from "@/lib/date-utils";
import { isReminderAlerting } from "@/lib/board/reminder-alerts";
import { fimDoTempoAoPausar, minutosPrevistos, perguntaVenceEm } from "@/lib/board/timer-pergunta";

// Quanto tempo depois do horário da refeição o aviso "Foco na dieta" ainda aparece.
// Antes ele aparecia para TODA refeição já passada do dia, e como o "×" só
// valia até fechar o app, cada vez que o FARO abria vinham de volta o café, o
// almoço... Agora é só o aviso do horário (com folga para quem abre um pouco depois).
const JANELA_DA_REFEICAO_MIN = 30;

const chaveDispensadas = (dia: string) => `faro-dieta-dispensadas:${dia}`;

function lerDispensadas(dia: string): Set<string> {
  try {
    const bruto = localStorage.getItem(chaveDispensadas(dia));
    return new Set(bruto ? (JSON.parse(bruto) as string[]) : []);
  } catch {
    return new Set();
  }
}

function minutosDoDia(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function TimerNudges() {
  const { board } = useBoardCtx();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [dismissedUpcoming, setDismissedUpcoming] = useState<Set<string>>(new Set());
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
  // O "×" da dieta vale pelo dia inteiro, mesmo fechando e abrindo o app.
  const [dismissedDietMeals, setDismissedDietMeals] = useState<Set<string>>(() =>
    typeof window === "undefined" ? new Set() : lerDispensadas(todayISO())
  );

  function dispensarRefeicao(id: string) {
    setDismissedDietMeals((s) => {
      const novo = new Set(s).add(id);
      try {
        localStorage.setItem(chaveDispensadas(todayISO()), JSON.stringify([...novo]));
      } catch {
        // sem armazenamento: vale só até fechar o app
      }
      return novo;
    });
  }

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const h = setInterval(tick, 20000);
    return () => clearInterval(h);
  }, []);

  // "Você ainda está aí?": cronômetro rodando passou do tempo previsto (ou de 30 min sem confirmação).
  const perguntas =
    nowMs !== null
      ? board.state.activeTimers.flatMap((at) => {
          let nome: string | null = null;
          let previsto: number | null = null;
          if (at.kind === "task") {
            const task = board.state.tasks.find((t) => t.id === at.itemId);
            if (!task) return [];
            nome = task.title;
            previsto = minutosPrevistos(task);
          } else {
            const item = (at.kind === "habit" ? board.state.habits : board.state.fixedBlocks).find((x) => x.id === at.itemId);
            if (!item) return [];
            nome = item.name;
            previsto = item.durationMin;
          }
          const venceEm = perguntaVenceEm(at.startedAt, at.confirmedAt, previsto);
          if (nowMs < venceEm) return [];
          return [{ at, nome, venceEm }];
        })
      : [];

  const overdueBanners = perguntas.map(({ at, nome, venceEm }) => {
    const rodando = fmtTempoCurto(Math.floor((nowMs! - at.startedAt) / 1000));
    const fim = fimDoTempoAoPausar(venceEm, nowMs!);
    const atrasada = fim === venceEm && nowMs! - venceEm > 60000;
    const horaDaPergunta = new Date(venceEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="timer-nudge timer-nudge-ainda" key={`ainda-${at.id}`} role="alert">
        <span className="timer-nudge-text">
          <BellIcon filled />
          Você ainda está aí? &ldquo;{nome}&rdquo; está rodando há {rodando}.
          {atrasada ? ` Se pausar, conto só até ${horaDaPergunta}.` : ""}
        </span>
        <div className="timer-nudge-actions">
          <button type="button" className="btn btn-accent" onClick={() => board.confirmTimer(at.id)}>
            <PlayIcon /> Continuar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => board.pauseTimerUntil(at.id, fim)}>
            Pausar
          </button>
        </div>
      </div>
    );
  });

  const today = todayISO();
  let upcoming: (typeof board.state.tasks)[number] | undefined;
  if (nowMs !== null) {
    const now = new Date(nowMs);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    upcoming = board.state.tasks.find((t) => {
      if (t.date !== today || !t.time || t.done) return false;
      if (dismissedUpcoming.has(t.id)) return false;
      if (board.state.activeTimers.some((at) => at.kind === "task" && at.itemId === t.id)) return false;
      const [hh, mm] = t.time.split(":").map(Number);
      const taskMin = hh * 60 + mm;
      return nowMin >= taskMin - 5 && nowMin < taskMin;
    });
  }

  const upcomingBanner = upcoming ? (
    <div className="timer-nudge" key="upcoming">
      <span className="timer-nudge-text">
        <BellIcon filled />
        &ldquo;{upcoming.title}&rdquo; começa às {upcoming.time} — iniciar o cronômetro?
      </span>
      <div className="timer-nudge-actions">
        <button type="button" className="btn btn-accent" onClick={() => board.toggleTimer("task", upcoming.id, today)}>
          <PlayIcon /> Iniciar
        </button>
        <button
          type="button"
          className="icon-btn timer-nudge-close"
          onClick={() => setDismissedUpcoming((s) => new Set(s).add(upcoming.id))}
          aria-label="Dispensar"
        >
          ×
        </button>
      </div>
    </div>
  ) : null;

  const reminderBanners =
    nowMs !== null
      ? board.state.reminders
          .filter((r) => r.inApp !== false && !dismissedReminders.has(r.id) && isReminderAlerting(r, nowMs))
          .map((r) => (
            <div className="timer-nudge" key={`reminder-${r.id}`}>
              <span className="timer-nudge-text">
                <BellIcon filled />
                Lembrete: &ldquo;{r.title}&rdquo;
                {r.date ? ` — ${r.date.split("-").reverse().join("/")}` : ""}
                {r.time ? ` às ${r.time}` : ""}
              </span>
              <div className="timer-nudge-actions">
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => board.updateReminder(r.id, { done: true })}
                >
                  <CheckIcon /> Concluir
                </button>
                <button
                  type="button"
                  className="icon-btn timer-nudge-close"
                  onClick={() => setDismissedReminders((s) => new Set(s).add(r.id))}
                  aria-label="Dispensar"
                >
                  ×
                </button>
              </div>
            </div>
          ))
      : [];

  const dietMealsChecked = board.state.dailyLogs[today]?.dietMealsChecked ?? [];
  let nowHM: string | null = null;
  let nowWeekDay: number | null = null;
  if (nowMs !== null) {
    const now = new Date(nowMs);
    nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    nowWeekDay = now.getDay();
  }
  const dietBanners =
    nowHM !== null && board.state.settings.dietAppOptIn
      ? board.state.dietMeals
          .filter(
            (m) =>
              m.active &&
              nowHM! >= m.time &&
              minutosDoDia(nowHM!) - minutosDoDia(m.time) < JANELA_DA_REFEICAO_MIN &&
              (!m.weekDays || m.weekDays.length === 0 || m.weekDays.includes(nowWeekDay!)) &&
              !dietMealsChecked.includes(m.id) &&
              !dismissedDietMeals.has(m.id)
          )
          .map((m) => (
            <div className="timer-nudge" key={`diet-${m.id}`}>
              <span className="timer-nudge-text">
                <BellIcon filled />
                Foco na dieta — {m.name}
                {m.message ? `: ${m.message}` : ""}
              </span>
              <div className="timer-nudge-actions">
                {board.state.settings.dietWhatsappOptIn && m.notifyWhatsapp && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Enviar por WhatsApp"
                    onClick={() => {
                      const text = m.message.trim() || `${m.name} — hora da refeição!`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <SendIcon />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn timer-nudge-close"
                  onClick={() => dispensarRefeicao(m.id)}
                  aria-label="Dispensar"
                >
                  ×
                </button>
              </div>
            </div>
          ))
      : [];

  if (overdueBanners.length === 0 && !upcomingBanner && reminderBanners.length === 0 && dietBanners.length === 0) {
    return null;
  }

  return (
    <div className="timer-nudge-stack">
      {overdueBanners}
      {upcomingBanner}
      {reminderBanners}
      {dietBanners}
    </div>
  );
}
