export type Category = "trabalho" | "estudo" | "dev" | "saude" | "pessoal" | "familia";
export type Priority = "alta" | "media" | "baixa";
export type Repeat = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type TimerKind = "task" | "habit" | "block";
export type ScopeChoice = "esta" | "proximas" | "todas";

export const CATEGORY_LABEL: Record<Category, string> = {
  trabalho: "Trabalho",
  estudo: "Estudo",
  dev: "Dev. pessoal",
  saude: "Saúde",
  pessoal: "Pessoal",
  familia: "Família",
};

export const DEFAULT_TAG_COLORS: Record<Category, { hex: string; alpha: number }> = {
  trabalho: { hex: "#B0581A", alpha: 0.5 },
  estudo: { hex: "#226C9C", alpha: 0.5 },
  dev: { hex: "#6C4296", alpha: 0.5 },
  saude: { hex: "#277644", alpha: 0.5 },
  pessoal: { hex: "#A23E68", alpha: 0.5 },
  familia: { hex: "#1B7F79", alpha: 0.5 },
};

export interface Task {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  date: string | null; // ISO date, null = backlog
  time: string; // "HH:MM" or ""
  durationMin: number | null;
  note: string;
  done: boolean;
  order: number;
  seriesId: string | null;
  trackedSeconds: number;
  quick: number; // 0-3
  statusId: string | null;
}

export interface TaskStatus {
  id: string;
  label: string;
  color: string;
  isDone: boolean;
  order: number;
}

export interface TaskSeries {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  note: string;
  time: string;
  repeat: Repeat;
  startDate: string;
  skippedDates: string[];
}

export interface DayLogEntry {
  id: string;
  note: string;
  minutes: number;
}

export interface DayLog {
  checked: boolean;
  trackedSeconds: number;
  note?: string | null;
  entries?: DayLogEntry[]; // fixed blocks with noteOptions: multiple marked entries for the day
}

export interface RecurringItem {
  id: string;
  name: string;
  durationMin: number | null;
  order: number;
  logs: Record<string, DayLog>; // iso date -> log
  noteOptions?: string[]; // fixed blocks only: registered options to pick instead of typing a note
}

export interface Settings {
  tagColors: Record<Category, { hex: string; alpha: number }>;
  dailyBudgetHours: number;
  waterGoalMl: number;
  featureFlags: Record<string, boolean>;
}

// Funcionalidades opcionais que podem ser ligadas/desligadas em Configurações.
// Toda funcionalidade nova e opcional do painel do dia (e futuras seções) deve
// entrar nessa lista em vez de aparecer sempre fixa na tela.
export const OPTIONAL_FEATURES: { key: string; label: string; hint: string }[] = [
  { key: "water", label: "Água", hint: "Meta diária e registro de água bebida" },
  { key: "diet", label: "Dieta", hint: "% de fidelidade à dieta do dia" },
  { key: "sleep", label: "Sono", hint: "Horário de dormir e de acordar" },
  { key: "mood", label: "Humor", hint: "Check-in de humor diário" },
];

export function isFeatureEnabled(flags: Record<string, boolean> | undefined, key: string): boolean {
  return flags?.[key] !== false;
}

export interface DailyLog {
  waterMl: number;
  dietPct: number | null;
  dietNote: string | null;
  sleptAt: string | null; // "HH:MM"
  wokeAt: string | null; // "HH:MM"
  mood: number | null; // 1-5
  // Free-text "why do you feel this way" the user can attach when picking a mood.
  // Kept around (not just the number) as raw material for the future mood
  // panel: recurring-thought / trigger detection, motivational phrases, and
  // correlating mood swings against routine data to spot gaps.
  moodNote: string | null;
}

export interface ActiveTimer {
  kind: TimerKind;
  itemId: string;
  logDate: string;
  startedAt: number; // epoch ms
}

export type BookStatus = "para_ler" | "lendo" | "finalizado";

export const BOOK_STATUS_ORDER: BookStatus[] = ["lendo", "para_ler", "finalizado"];

export const BOOK_STATUS_LABEL: Record<BookStatus, string> = {
  para_ler: "Para ler",
  lendo: "Lendo",
  finalizado: "Finalizado",
};

export const BOOK_STATUS_COLOR: Record<BookStatus, string> = {
  para_ler: "var(--book-blue)",
  lendo: "var(--book-yellow)",
  finalizado: "var(--success)",
};

export const BOOK_GROUP_LABEL: Record<BookStatus, string> = {
  para_ler: "Para ler",
  lendo: "Em leitura",
  finalizado: "Concluído",
};

export interface Book {
  id: string;
  title: string;
  status: BookStatus;
  insights: string | null;
  startedAt: string | null; // ISO date, "lendo": quando começou
}

export interface BoardState {
  tasks: Task[];
  habits: RecurringItem[];
  fixedBlocks: RecurringItem[];
  taskSeries: TaskSeries[];
  taskStatuses: TaskStatus[];
  books: Book[];
  settings: Settings;
  activeTimer: ActiveTimer | null;
  dailyLogs: Record<string, DailyLog>; // iso date -> log
}
