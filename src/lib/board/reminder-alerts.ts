import type { Reminder } from "@/lib/types";

export const REMINDER_ALERT_PRESETS: { v: number | null; l: string }[] = [
  { v: null, l: "Sem aviso" },
  { v: 10, l: "10 min antes" },
  { v: 30, l: "30 min antes" },
  { v: 60, l: "1h antes" },
  { v: 1440, l: "1 dia antes" },
  { v: 2880, l: "2 dias antes" },
  { v: 10080, l: "1 semana antes" },
];

export function reminderTargetMs(reminder: Pick<Reminder, "date" | "time">): number | null {
  if (!reminder.date) return null;
  const time = reminder.time ?? "23:59";
  const d = new Date(`${reminder.date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function isReminderAlerting(reminder: Reminder, nowMs: number): boolean {
  if (reminder.done || !reminder.alertMinutesBefore) return false;
  const targetMs = reminderTargetMs(reminder);
  if (targetMs === null) return false;
  const alertAtMs = targetMs - reminder.alertMinutesBefore * 60000;
  return nowMs >= alertAtMs && nowMs < targetMs;
}

// Vencido: já passou da data (e hora, se marcada) — sem hora, considera o dia inteiro
// (só vence depois de 23:59). Com hora marcada, vence assim que aquele horário passa,
// mesmo no mesmo dia — é o caso do lembrete "hoje às 13:30" que já passou da hora.
// nowMs é opcional (default: agora) pra dar pra chamar direto no corpo de um componente,
// igual todayISO() — só recebe explícito quem já tem um relógio vivo (TimerNudges).
export function isReminderOverdue(reminder: Pick<Reminder, "date" | "time" | "done">, nowMs: number = Date.now()): boolean {
  if (reminder.done) return false;
  const targetMs = reminderTargetMs(reminder);
  if (targetMs === null) return false;
  return nowMs > targetMs;
}
