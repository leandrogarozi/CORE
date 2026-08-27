import type { Repeat, TaskSeries } from "./types";

export const DAY_NAMES = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
export const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];
export const MONTH_NAMES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho",
  "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return isoFromDate(new Date());
}

export function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtShortDate(iso: string): string {
  const d = dateFromISO(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function monthAnchorOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isoAddDays(iso: string, days: number): string {
  const d = dateFromISO(iso);
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const diffMs = dateFromISO(endIso).getTime() - dateFromISO(startIso).getTime();
  return Math.round(diffMs / 86400000) + 1;
}

export function isoAddMonths(iso: string, months: number): string {
  const [y, m, day] = iso.split("-").map(Number);
  const lastDay = new Date(y, m - 1 + months + 1, 0).getDate();
  const d = new Date(y, m - 1 + months, Math.min(day, lastDay));
  return isoFromDate(d);
}

export function isoAddYears(iso: string, years: number): string {
  const [y, m, day] = iso.split("-").map(Number);
  const ny = y + years;
  const lastDay = new Date(ny, m, 0).getDate();
  const d = new Date(ny, m - 1, Math.min(day, lastDay));
  return isoFromDate(d);
}

export function stepIso(repeat: Repeat, iso: string): string | null {
  if (repeat === "daily") return isoAddDays(iso, 1);
  if (repeat === "weekly") return isoAddDays(iso, 7);
  if (repeat === "monthly") return isoAddMonths(iso, 1);
  if (repeat === "yearly") return isoAddYears(iso, 1);
  return null;
}

export function occurrenceDates(series: TaskSeries, fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  if (!series.startDate || !series.repeat || series.repeat === "none") return out;
  let cur: string | null = series.startDate;
  let guard = 0;
  while (cur && cur < fromISO && guard < 5000) {
    cur = stepIso(series.repeat, cur);
    guard++;
  }
  guard = 0;
  while (cur && cur <= toISO && guard < 400) {
    out.push(cur);
    cur = stepIso(series.repeat, cur);
    guard++;
  }
  return out;
}

export function fmtDayLabel(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

export function longLabel(iso: string): string {
  const d = dateFromISO(iso);
  return `${fmtDayLabel(d)} · ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function monthGridDates(monthAnchor: Date): Date[] {
  const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  const end = new Date(last);
  end.setDate(end.getDate() + (6 - last.getDay()));
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function weekDatesFrom(anchorMonday: Date): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(anchorMonday);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

export function fmtHM(min: number): string {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h${m ? ` ${m}min` : ""}`;
  return `${m}min`;
}

export function fmtClock(totalSeconds: number): string {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p2 = (n: number) => String(n).padStart(2, "0");
  return (h > 0 ? `${p2(h)}:` : "") + `${p2(m)}:${p2(s)}`;
}
