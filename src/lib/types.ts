export type Category = "trabalho" | "estudo" | "dev" | "saude" | "pessoal" | "familia" | "reuniao";
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
  reuniao: "Reunião",
};

export const DEFAULT_TAG_COLORS: Record<Category, { hex: string; alpha: number }> = {
  trabalho: { hex: "#B0581A", alpha: 0.5 },
  estudo: { hex: "#226C9C", alpha: 0.5 },
  dev: { hex: "#6C4296", alpha: 0.5 },
  saude: { hex: "#277644", alpha: 0.5 },
  pessoal: { hex: "#A23E68", alpha: 0.5 },
  familia: { hex: "#1B7F79", alpha: 0.5 },
  reuniao: { hex: "#4A5FC1", alpha: 0.5 },
};

export interface Task {
  id: string;
  title: string;
  category: Category;
  category2: Category | null; // segunda tag opcional (ex.: Trabalho + Reunião), não conta pro relatório em dobro sozinha
  priority: Priority;
  date: string | null; // ISO date, null = backlog
  time: string; // "HH:MM" or ""
  durationMin: number | null;
  expectedDurationMin: number | null; // previsão de duração (ex.: reunião de 30min) — usada pra avisar quando passar do previsto
  note: string;
  done: boolean;
  order: number;
  seriesId: string | null;
  trackedSeconds: number;
  quick: number; // 0-3
  statusId: string | null;
  deletedAt: string | null; // ISO datetime — soft delete, tarefa vai pra Lixeira em vez de sumir na hora
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
  category2: Category | null;
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
  avatarUrl: string | null;
  preferredName: string | null; // como o FARO (IA, fase 2) deve chamar o usuário
  birthDate: string | null; // ISO date
  notifyPhone: string | null; // WhatsApp/telefone — pra onde mandar notificações (dependência futura)
  timezone: string | null; // IANA tz, ex. "America/Sao_Paulo"; null = detectar do navegador
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

export interface Reminder {
  id: string;
  title: string;
  date: string | null; // ISO date, null = sem data
  time: string | null; // "HH:MM", só faz sentido com date definido
  repeat: Repeat; // só faz sentido com date definido
  weekDays: number[] | null; // 0=dom..6=sáb — repetição por dia da semana (ex.: trocar filtro 2x/semana)
  alertMinutesBefore: number | null; // aviso antecipado (minutos antes de date+time), null = sem aviso
  done: boolean;
}

export type MedicationTimeMode = "shared" | "individual";

export interface MedicationGroup {
  id: string;
  name: string; // motivo/tratamento, ex.: "Tratamento sinusite"
  notes: string | null;
  timeMode: MedicationTimeMode; // "shared": um horário pra todos os remédios; "individual": cada um o seu
  sharedTime: string | null; // usado quando timeMode === "shared"
  startDate: string | null; // ISO date — quando usada com durationDays
  durationDays: number | null; // duração do tratamento inteiro, ex.: 10 dias
  active: boolean;
}

export interface Medication {
  id: string;
  groupId: string | null; // null = recorrente (avulso); definido = pertence a um tratamento temporário
  name: string;
  time: string | null; // "HH:MM" — próprio; ignorado se o grupo estiver em modo "shared"
  notes: string | null;
  startDate: string | null; // ISO date — duração própria do remédio (opcional, independente do grupo)
  durationDays: number | null;
  weekDays: number[] | null; // 0=DOM..6=SAB; null/vazio = todos os dias, senão só nesses dias da semana
  active: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  toBuy: boolean; // precisa comprar antes (ex.: supermercado) — separa da lista de itens pra levar/arrumar
}

export interface Checklist {
  id: string;
  title: string;
  type: string; // livre, ex.: "viagem", "trabalho"
  items: ChecklistItem[];
  createdAt: string; // ISO date
}

export interface BoardState {
  tasks: Task[];
  trashedTasks: Task[]; // tarefas excluídas (soft delete) — Lixeira
  habits: RecurringItem[];
  fixedBlocks: RecurringItem[];
  taskSeries: TaskSeries[];
  taskStatuses: TaskStatus[];
  books: Book[];
  reminders: Reminder[];
  medications: Medication[];
  medicationGroups: MedicationGroup[];
  checklists: Checklist[];
  settings: Settings;
  activeTimer: ActiveTimer | null;
  dailyLogs: Record<string, DailyLog>; // iso date -> log
}
