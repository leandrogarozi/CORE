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
