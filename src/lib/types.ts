export type Category = "trabalho" | "estudo" | "dev" | "saude" | "pessoal" | "familia" | "reuniao" | "sem_categoria";
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
  sem_categoria: "Sem categoria",
};

export const DEFAULT_TAG_COLORS: Record<Category, { hex: string; alpha: number }> = {
  trabalho: { hex: "#B0581A", alpha: 0.5 },
  estudo: { hex: "#226C9C", alpha: 0.5 },
  dev: { hex: "#6C4296", alpha: 0.5 },
  saude: { hex: "#277644", alpha: 0.5 },
  pessoal: { hex: "#A23E68", alpha: 0.5 },
  familia: { hex: "#1B7F79", alpha: 0.5 },
  reuniao: { hex: "#4A5FC1", alpha: 0.5 },
  sem_categoria: { hex: "#E5484D", alpha: 0.6 },
};

export interface Task {
  id: string;
  // Código curto (6 caracteres) pra copiar e colar em lembretes e anotações, e
  // depois achar a tarefa pela busca. Vazio só em tarefa antiga sem código.
  code: string;
  title: string;
  category: Category;
  category2: Category | null; // segunda tag opcional (ex.: Trabalho + Reunião), não conta pro relatório em dobro sozinha
  priority: Priority;
  date: string | null; // ISO date, null = backlog
  time: string; // "HH:MM" or ""
  endDate: string | null; // ISO date — fim de um evento que passa de um dia (ex.: viagem, curso); null = evento de um dia só (usa só "date")
  endTime: string | null; // "HH:MM" — horário de término, no endDate (ou no date, se endDate vazio)
  durationMin: number | null;
  expectedDurationMin: number | null; // previsão de duração (ex.: reunião de 30min) — usada pra avisar quando passar do previsto
  note: string;
  done: boolean;
  order: number;
  seriesId: string | null;
  studyPlanId: string | null; // sessão de um plano de estudo
  // Evento = compromisso com hora marcada (visita, consulta, reunião), em
  // oposição a tarefa, que é flexível e pode andar de dia. Marcação explícita:
  // quase toda tarefa tem data, então "tem data = evento" não distinguiria nada.
  isEvent: boolean;
  // "Desafiadora" não é o mesmo que prioridade alta: é a tarefa da qual se foge.
  // Adiar uma dessas pede um motivo — é o que revela o padrão do que está sendo
  // evitado.
  challenging: boolean;
  // Soma do tempo de todos os dias (ver TaskTimeEntry). É espelho: quem manda é
  // a lista por dia. Fica aqui pra somar projeto e mostrar o total sem varrer
  // as entradas toda hora.
  trackedSeconds: number;
  quick: number; // 0-3
  statusId: string | null;
  deletedAt: string | null; // ISO datetime — soft delete, tarefa vai pra Lixeira em vez de sumir na hora
  projectId: string | null; // vincula essa tarefa como etapa de um Projeto (PDA)
  client: string | null; // nome do cliente — usado quando é reunião, pra agrupar na aba Reuniões
}

// Reunião = categoria ou 2ª categoria "reuniao" — cobre tanto reunião criada
// pelo botão rápido (category2) quanto marcada manualmente na edição (category).
export function isMeetingTask(t: Pick<Task, "category" | "category2">): boolean {
  return t.category === "reuniao" || t.category2 === "reuniao";
}

// Tempo trabalhado numa tarefa em UM dia. O tempo mora no dia, não na tarefa:
// jogar a tarefa pra amanhã não pode levar junto as horas de hoje — foi hoje
// que o trabalho aconteceu. Uma linha por tarefa + dia.
export interface TaskTimeEntry {
  id: string;
  taskId: string;
  date: string; // ISO date
  seconds: number;
}

// Um adiamento registrado. Em tarefa desafiadora o app pede o motivo e a
// "historinha" (a justificativa que a pessoa conta a si mesma pra não fazer —
// palavra do próprio Leandro). Nas outras, grava sozinho, sem atrito.
// O valor está no acúmulo: depois de um mês isso mostra o padrão do que está
// sendo evitado, com que desculpa e em que dias.
export interface TaskPostponement {
  id: string;
  taskId: string;
  fromDate: string | null;
  toDate: string | null;
  reason: string | null; // "por que está adiando" + a historinha, juntos
  createdAt: string;
}

export type StudyPlanStatus = "ativo" | "pausado" | "concluido";

// Plano de estudo: um compromisso grande (matéria da pós, mentoria) que o app
// quebra em sessões diárias. O que resolve a ansiedade não é cadastrar — é a
// conta: quanto por dia pra caber no prazo, e quando termina no ritmo atual.
export interface StudyPlan {
  id: string;
  name: string;
  description: string;
  totalMinutes: number | null; // tamanho estimado do estudo inteiro
  sessionMinutes: number; // quanto dura cada sessão (o "40 a 60 min por dia")
  weekDays: number[]; // 0=dom .. 6=sáb — em quais dias estudar
  startDate: string | null;
  deadline: string | null;
  status: StudyPlanStatus;
  category: Category;
  category2: Category | null;
  createdAt: string;
}

export type ProjectStatus = "active" | "done" | "cancelled";

export interface Project {
  id: string;
  name: string;
  description: string; // objetivo/notas livres
  status: ProjectStatus;
  createdAt: string; // ISO date
  defaultCategory: Category | null; // aplicada automaticamente em toda etapa nova
  defaultCategory2: Category | null;
  // Template do título das etapas, com placeholders {projeto} e {etapa} (contador
  // zero-padded). Null = usa PROJECT_NAMING_TEMPLATE_DEFAULT (ver mappers/UI).
  namingTemplate: string | null;
}

export const PROJECT_NAMING_TEMPLATE_DEFAULT = "[{projeto}] [Etapa_{etapa}] - ";

export type AttachmentEntityType = "task" | "reminder" | "book" | "project";

export interface Attachment {
  id: string;
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  filePath: string; // caminho no bucket "attachments" do Supabase Storage
  mimeType: string;
  sizeBytes: number;
  extractedText: string | null; // texto extraído (PDF/Word) na hora do upload, pra uso futuro por IA
  createdAt: string;
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
  waterStrategies: string | null; // ideias/estratégias pra manter o consumo de água (ex.: garrafa 1L com marcador)
  dietPlan: string | null; // cadastro livre da dieta (plano, receitas, divisão de macros...)
  dietAppOptIn: boolean; // quer lembretes de refeição dentro do app (aviso "Foco na dieta")
  dietWhatsappOptIn: boolean; // usuário confirmou que quer avisos de refeição também pelo WhatsApp (notifyPhone)
  // Custo do WhatsApp. Ficam em configuração (e não fixos no código) pra dar pra
  // calibrar contra a fatura real da Meta sem precisar de deploy.
  whatsappMsgCostUsd: number; // tarifa por mensagem enviada (utility no Brasil ≈ US$ 0,008)
  whatsappMonthlyCapUsd: number | null; // teto de gasto no mês; null = sem trava
  whatsappUsdBrl: number; // câmbio usado só pra mostrar o valor em reais
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
  dietMealsChecked: string[]; // ids das refeições marcadas como "não pulei" hoje — não mede fidelidade, só presença
  dietMealNotes: Record<string, string>; // mealId -> observação daquele dia (ex.: "pequei nisso, comi mais disso...")
  sleptAt: string | null; // "HH:MM"
  wokeAt: string | null; // "HH:MM"
  mood: number | null; // 1-5
  // Free-text "why do you feel this way" the user can attach when picking a mood.
  // Kept around (not just the number) as raw material for the future mood
  // panel: recurring-thought / trigger detection, motivational phrases, and
  // correlating mood swings against routine data to spot gaps.
  moodNote: string | null;
  // Emoção específica do dia (estressado, ansioso, confiante...), a par da
  // intensidade 1-5 acima — ver MOOD_EMOTIONS em lib/mood.ts.
  moodEmotion: string | null;
}

export interface ActiveTimer {
  id: string;
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
  priority: Priority;
  insights: string | null;
  startedAt: string | null; // ISO date, "lendo": quando começou
  order: number; // fila de leitura dentro do grupo (ex.: "Para ler") — arrastar pra reordenar
}

/**
 * Nova Sinapse: um aprendizado que muda uma crença, guardado junto com a pergunta
 * que reconecta com ele. A pergunta é a parte que faz a sinapse ser lembrada —
 * sem ela vira só mais uma anotação.
 */
export interface Synapse {
  id: string;
  title: string; // o "nome" da sinapse, ex.: "Qual o personagem?"
  learning: string; // HTML — o aprendizado em si
  questions: string; // HTML — a(s) pergunta(s) que o aprendizado gera
  source: string | null; // de onde veio (conversa, livro, filme...)
  createdAt: string;
}

export type ReminderStatus = "pending" | "waiting" | "done";

export interface Reminder {
  id: string;
  title: string;
  date: string | null; // ISO date, null = sem data
  time: string | null; // "HH:MM", só faz sentido com date definido
  repeat: Repeat; // só faz sentido com date definido
  weekDays: number[] | null; // 0=dom..6=sáb — repetição por dia da semana (ex.: trocar filtro 2x/semana)
  alertMinutesBefore: number | null; // aviso antecipado (minutos antes de date+time), null = sem aviso
  note: string | null; // observação livre — colar um texto, escrever algo
  done: boolean;
  status: ReminderStatus; // "waiting" é um estado manual (ex.: aguardando resposta de terceiros), não mexe no cálculo de vencido/hoje
  deletedAt: string | null; // ISO datetime — soft delete, vai pra Lixeira em vez de sumir na hora
  taskId: string | null; // quando o lembrete foi criado a partir de uma tarefa (campo "Lembrete" na edição)
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

export interface ChecklistExpense {
  id: string;
  label: string; // no que foi gasto, ex.: "Hotel", "Gasolina"
  amountCents: number; // em centavos, pra não somar centavo errado com float
  date: string | null; // ISO date — quando gastou; null = sem data
}

export interface Checklist {
  id: string;
  title: string;
  type: string; // livre, ex.: "viagem", "trabalho"
  items: ChecklistItem[];
  createdAt: string; // ISO date
  expensesEnabled: boolean; // liga a aba Gastos desse checklist
  expenses: ChecklistExpense[];
  budgetCents: number | null; // quanto planejou gastar — opcional, só pra comparar
}

export interface DietMeal {
  id: string;
  name: string; // ex.: "Café da manhã"
  time: string; // "HH:MM"
  message: string; // texto livre do lembrete — o usuário escolhe se é só o horário ou o cardápio/calorias completos
  active: boolean;
  notifyWhatsapp: boolean; // avisar essa refeição também por WhatsApp — só relevante se Settings.dietWhatsappOptIn
  weekDays: number[] | null; // 0=dom..6=sáb; null/vazio = todo dia, senão só nesses dias da semana
}

export interface BoardState {
  tasks: Task[];
  taskTimeEntries: TaskTimeEntry[]; // tempo por dia das tarefas
  studyPlans: StudyPlan[];
  taskPostponements: TaskPostponement[];
  trashedTasks: Task[]; // tarefas excluídas (soft delete) — Lixeira
  projects: Project[]; // PDA — planos de ação com tarefas vinculadas como etapas
  habits: RecurringItem[];
  fixedBlocks: RecurringItem[];
  dietMeals: DietMeal[];
  taskSeries: TaskSeries[];
  taskStatuses: TaskStatus[];
  books: Book[];
  synapses: Synapse[];
  reminders: Reminder[];
  trashedReminders: Reminder[]; // lembretes excluídos (soft delete) — Lixeira
  medications: Medication[];
  medicationGroups: MedicationGroup[];
  checklists: Checklist[];
  settings: Settings;
  activeTimers: ActiveTimer[];
  dailyLogs: Record<string, DailyLog>; // iso date -> log
  attachmentKeys: Set<string>; // "<entityType>:<entityId>" com ao menos 1 anexo — só pra indicador (ícone), não a lista em si
}
