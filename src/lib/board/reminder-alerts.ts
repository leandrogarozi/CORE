import { dateFromISO, isoAddDays, stepIso, todayISO } from "@/lib/date-utils";
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

export function isRecurringReminder(reminder: Pick<Reminder, "repeat" | "weekDays">): boolean {
  return reminder.repeat !== "none" || (reminder.weekDays?.length ?? 0) > 0;
}

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

// Próxima ocorrência de um lembrete recorrente, a partir de hoje (não da data antiga do
// lembrete concluído) — usada pra gerar o lembrete de continuação quando um recorrente é
// marcado como concluído. Sem data nem dia da semana batendo, não tem o que gerar (null).
export function nextReminderOccurrenceDate(
  reminder: Pick<Reminder, "date" | "repeat" | "weekDays">
): string | null {
  const today = todayISO();
  if (reminder.weekDays && reminder.weekDays.length > 0 && reminder.weekDays.length < 7) {
    const base = reminder.date && reminder.date >= today ? reminder.date : today;
    for (let i = 1; i <= 14; i++) {
      const candidate = isoAddDays(base, i);
      if (reminder.weekDays.includes(dateFromISO(candidate).getDay())) return candidate;
    }
    return null;
  }
  if (reminder.repeat !== "none" && reminder.date) {
    return stepIso(reminder.repeat, reminder.date);
  }
  return null;
}
