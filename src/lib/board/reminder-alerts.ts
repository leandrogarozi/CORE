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

// Quanto o fuso está deslocado do UTC no instante utcMs (positivo a leste).
function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const v = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - utcMs;
}

/**
 * Converte "2026-09-05" + "10:00" lidos NO FUSO DO USUÁRIO pro instante real.
 *
 * No navegador o `new Date("...T10:00")` do reminderTargetMs já acerta, porque o
 * fuso local é o do usuário. No servidor (Vercel roda em UTC) ele erraria em 3h:
 * um lembrete das 10:00 viraria 07:00 de Brasília. Por isso o disparo automático
 * usa esta função com o `timezone` salvo em settings.
 */
export function zonedDateTimeToMs(dateISO: string, time: string, timeZone: string): number {
  const asIfUtc = Date.parse(`${dateISO}T${time}:00Z`);
  if (Number.isNaN(asIfUtc)) return NaN;
  const firstPass = asIfUtc - timeZoneOffsetMs(asIfUtc, timeZone);
  // Segunda passada: nas viradas de horário de verão o deslocamento do palpite
  // inicial pode não ser o mesmo do instante final.
  const offset = timeZoneOffsetMs(firstPass, timeZone);
  return asIfUtc - offset;
}

/** Mesma regra do isReminderAlerting, mas lendo data/hora no fuso do usuário. */
export function isReminderAlertingInZone(reminder: Reminder, nowMs: number, timeZone: string): boolean {
  if (reminder.done || !reminder.alertMinutesBefore) return false;
  if (!reminder.date) return false;
  const targetMs = zonedDateTimeToMs(reminder.date, reminder.time ?? "23:59", timeZone);
  if (Number.isNaN(targetMs)) return false;
  const alertAtMs = targetMs - reminder.alertMinutesBefore * 60000;
  return nowMs >= alertAtMs && nowMs < targetMs;
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

/**
 * O que falta pro lembrete poder nascer, em português, ou null se está pronto.
 *
 * Lembrete sem data e hora não avisa, não entra na agenda e não aparece como
 * atrasado — nasce como linha morta que ele teria que caçar depois. Vale pra
 * CRIAÇÃO; editar um lembrete antigo sem data continua liberado, senão os que
 * já existem ficariam impossíveis de salvar.
 *
 * Mora fora dos componentes porque as duas portas de criação (a tela de
 * Lembretes e o popover do sininho) têm que cobrar a mesma coisa, com a mesma
 * frase.
 */
export function oQueFaltaNoLembrete(date: string | null, time: string | null): string | null {
  const temData = !!date?.trim();
  const temHora = !!time?.trim();
  if (temData && temHora) return null;
  const falta = !temData && !temHora ? "data e hora" : !temData ? "a data" : "a hora";
  return `Falta ${falta} — o lembrete precisa saber quando avisar.`;
}

/**
 * O lembrete vai REALMENTE mandar WhatsApp?
 *
 * Marcado não basta: sem data e sem antecedência o motor nunca pega essa linha,
 * então pintar o ícone de verde seria prometer uma mensagem que não sai. Foi a
 * regra que ele pediu com todas as letras — *"botão verde do WhatsApp marcado =
 * vai sair / desmarquei - para de sair"* — depois de encontrar cem lembretes
 * verdes dos quais só um podia disparar.
 *
 * Mora aqui porque agora são DUAS telas desenhando esse ícone (a lista de
 * lembretes e a linha da tarefa). Duas cópias da regra viram duas verdades no
 * dia em que uma delas mudar.
 */
export function oZapVaiSair(
  reminder: Pick<Reminder, "whatsapp" | "date" | "alertMinutesBefore">
): boolean {
  return reminder.whatsapp && reminder.date !== null && reminder.alertMinutesBefore !== null;
}
