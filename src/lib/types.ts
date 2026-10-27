export type Category = "trabalho" | "estudo" | "dev" | "saude" | "pessoal" | "familia" | "reuniao" | "evento" | "sem_categoria";
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
  evento: "Evento",
  sem_categoria: "Sem categoria",
};

export const DEFAULT_TAG_COLORS: Record<Category, { hex: string; alpha: number }> = {
  trabalho: { hex: "#B0581A", alpha: 0.5 },
  estudo: { hex: "#226C9C", alpha: 0.5 },
  dev: { hex: "#6C4296", alpha: 0.5 },
  saude: { hex: "#277644", alpha: 0.5 },
  // Ardósia, não o magenta anterior: a paleta já tem laranja, azul, roxo, verde
  // e teal — faltava um tom calmo, e o magenta brigava com todos.
  pessoal: { hex: "#5C6B8A", alpha: 0.5 },
  familia: { hex: "#1B7F79", alpha: 0.5 },
  reuniao: { hex: "#4A5FC1", alpha: 0.5 },
  evento: { hex: "#A47A0D", alpha: 0.5 },
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
  // "Rastrear" (o FARO rastreia a tarefa): se o dia virar e a tarefa não estiver concluída, ela passa sozinha
  // pra hoje, mantendo status e horário. Não é adiamento: não pede justificativa
  // nem entra no registro de adiamentos.
  follows: boolean;
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

// O que aparece na tela Reuniões: quem tem a tag Reunião OU foi marcado como
// compromisso (evento). Marcar "compromisso" é o gesto que ele lembra de fazer;
// a tag Reunião é só o complemento (ver faltaTagReuniao).
export function entraEmReunioes(t: Pick<Task, "category" | "category2" | "isEvent">): boolean {
  return isMeetingTask(t) || t.isEvent;
}

// Evento = tag "Evento" (workshop, palestra, lançamento): é compromisso, mas não é reunião.
export function isEventTagTask(t: Pick<Task, "category" | "category2">): boolean {
  return t.category === "evento" || t.category2 === "evento";
}

// Compromisso que ainda não tem a tag Reunião NEM a tag Evento: a linha mostra um aviso para escolher.
export function faltaTagReuniao(t: Pick<Task, "category" | "category2" | "isEvent">): boolean {
  return t.isEvent && !isMeetingTask(t) && !isEventTagTask(t);
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

// ---------- Manutenção ----------
// O bem que recebe manutenção (carro, moto, apartamento).
export interface MaintenanceAsset {
  id: string;
  name: string;
  kind: "veiculo" | "casa" | "saude" | "outro";
  tracksOdometer: boolean;
  odometerUnit: string;
  // De quantos em quantos dias lembrar de conferir o odômetro. Sem leitura nova
  // não dá pra projetar o vencimento por km. null = não lembrar.
  odometerReminderDays: number | null;
  order: number;
}

export interface OdometerReading {
  id: string;
  assetId: string;
  reading: number;
  readOn: string; // ISO date
}

export interface MaintenanceItem {
  id: string;
  assetId: string;
  name: string;
  intervalMonths: number | null; // null = não vence por tempo
  intervalDistance: number | null; // null = não vence por uso
  alertDaysBefore: number;
  alertDistanceBefore: number;
  whatsapp: boolean; // zap do momento "fazer": avisa no WhatsApp (antes e no dia). Push chega sempre.
  // Momento "comprar": avisa buyDaysBefore dias antes do vencimento, só nos itens
  // que pedem compra (filtro, peça). null = esse item não tem aviso de compra.
  buyDaysBefore: number | null;
  boughtOn: string | null; // "Comprei": para o aviso de compra até o próximo ciclo
  whatsappBuy: boolean;
  // Momento "vencido": se passar do dia sem marcar "Feito", insiste 3 vezes.
  whatsappOverdue: boolean;
  // Sininho de cada momento: mostrar o aviso também dentro do app (banner e agenda).
  appBuy: boolean;
  appDo: boolean;
  appOverdue: boolean;
  overdueFrom: string | null; // "Lembrar de novo": a insistência recomeça a contar desta data
  lastDoneOn: string | null;
  lastDoneOdometer: number | null;
  note: string; // mensagem do WhatsApp
  observation: string; // observação pra pessoa (ex.: o que o médico explicou)
  // "Aguardando começar": comprei mas ainda não chegou. Enquanto estiver ligado o
  // item não conta prazo nem avisa; ao começar, o prazo conta a partir de cycleStartOn.
  waiting: boolean;
  cycleStartOn: string | null;
  active: boolean;
  order: number;
}

export interface MaintenanceService {
  id: string;
  itemId: string;
  doneOn: string;
  odometer: number | null;
  // Quanto custou, em centavos. É registro, não contabilidade: não é somado
  // nem consolidado em lugar nenhum do FARO — o controle de gastos é de outro
  // app. Serve pra consultar "quanto paguei da última vez".
  costCents: number | null;
  note: string;
}

export type StudyPlanStatus = "ativo" | "pausado" | "concluido";

// Plano de estudo: um compromisso grande (matéria da pós, mentoria) que o app
// quebra em sessões diárias. O que resolve a ansiedade não é cadastrar — é a
// conta: quanto por dia pra caber no prazo, e quando termina no ritmo atual.
// Uma parte do estudo (ex.: "Módulo 3 da pós"). O tempo gasto sai das sessões
// ligadas a ela (sessionIds): mesmo número do Painel de Horas, sem contabilidade paralela.
export interface StudyModule {
  id: string;
  name: string;
  minutes: number | null; // estimativa de duração, em minutos
  sessionIds: string[]; // sessões (tarefas do plano) que contam para este módulo
}

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
  modules: StudyModule[];
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
  deadline: string | null; // ISO date — prazo do projeto (opcional)
}

export const PROJECT_NAMING_TEMPLATE_DEFAULT = "[{projeto}] [Etapa_{etapa}] - ";

export type AttachmentEntityType = "task" | "reminder" | "book" | "project" | "synapse";

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
  // Qual status significa "agendado" é marcado por bandeira, não pelo texto:
  // amarrar no rótulo quebraria no dia em que o status fosse renomeado.
  isScheduled: boolean;
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
  // Tag opcional. Com ela, o tempo do bloco soma na categoria no relatório em
  // vez de virar fatia própria — "Lazer" marcado como Família é tempo de
  // família, não uma terceira coisa ao lado. Null mantém o comportamento
  // antigo, que é o certo pro "Crossfit", que não é categoria de tarefa nenhuma.
  category: Category | null;
}

export interface OpcoesDoDia {
  emotions: { v: string; label: string }[] | null;
  waterSteps: number[] | null;
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
  metanoiaVezes: number; // quantas frases por dia (1 a 3)
  metanoiaInicio: string; // "HH:MM": a partir de que horas o FARO manda frases
  metanoiaFim: string; // "HH:MM": até que horas; as frases do dia se distribuem entre os dois
  metanoiaPush: boolean; // a frase chega como notificação
  metanoiaTema: MetanoiaTema; // cartão da frase: fundo branco, preto ou o do app
  metanoiaPerguntasVezes: number; // quantas perguntas por dia (0 a 2)
  metanoiaPerguntasInicio: string; // "HH:MM"
  metanoiaPerguntasFim: string; // "HH:MM"
  dietAppOptIn: boolean; // quer lembretes de refeição dentro do app (aviso "Foco na dieta")
  dietWhatsappOptIn: boolean; // usuário confirmou que quer avisos de refeição também pelo WhatsApp (notifyPhone)
  // Custo do WhatsApp. Ficam em configuração (e não fixos no código) pra dar pra
  // calibrar contra a fatura real da Meta sem precisar de deploy.
  whatsappMsgCostUsd: number; // tarifa por mensagem enviada (utility no Brasil = US$ 0,0068 desde 01/07/2026)
  iaMonthlyCapBrl: number; // teto de gasto da IA no mês, EM REAIS (o servidor bloqueia ao chegar)
  whatsappMonthlyCapBrl: number | null; // teto de gasto no mês, EM REAIS; null = sem trava
  whatsappUsdBrl: number; // câmbio que converte a tarifa em dólar pra real
  // Fundo da tela. Guarda a ESCOLHA, não o CSS: claro e escuro precisam de
  // intensidades diferentes pro mesmo tom, e quem traduz isso é o código.
  bgTone: string | null; // id em TONS_DO_FUNDO; null = padrão
  bgIntensity: number | null; // 0 neutro .. 3 presente; null = padrão
  // Backup de aprendizado. Guarda os ids das áreas escolhidas, não um booleano
  // por área: ferramenta nova entra na lista do código e já aparece na tela,
  // sem migração de banco.
  backupAreas: string[] | null; // null = nunca configurou, vale "todas"
  backupName: string | null; // vira o título do índice e o nome do .zip
  // Frases prontas de aniversário (a fila do rodízio); {nome} vira o primeiro nome. null = as 4 padrão.
  birthdayMessages: BirthdayPhrase[] | null;
  // Opções do Registro do dia cadastradas em Configurações (emoções do Humor e botões de água). Null = de fábrica.
  dayOptions: OpcoesDoDia | null;
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

/** A mesma tela guarda três listas: livros, filmes e séries. O status é o mesmo; só o nome muda. */
export type BookKind = "livro" | "filme" | "serie";
export const BOOK_KIND_ORDER: BookKind[] = ["livro", "filme", "serie"];
export const BOOK_KIND_INFO: Record<
  BookKind,
  { aba: string; um: string; status: Record<BookStatus, string>; grupo: Record<BookStatus, string> }
> = {
  livro: {
    aba: "Livros",
    um: "livro",
    status: { para_ler: "Para ler", lendo: "Lendo", finalizado: "Finalizado" },
    grupo: { para_ler: "Para ler", lendo: "Em leitura", finalizado: "Concluído" },
  },
  filme: {
    aba: "Filmes",
    um: "filme",
    status: { para_ler: "Para assistir", lendo: "Assistindo", finalizado: "Assistido" },
    grupo: { para_ler: "Para assistir", lendo: "Assistindo agora", finalizado: "Já assisti" },
  },
  serie: {
    aba: "Séries",
    um: "série",
    status: { para_ler: "Para assistir", lendo: "Assistindo", finalizado: "Assistida" },
    grupo: { para_ler: "Para assistir", lendo: "Assistindo agora", finalizado: "Já assisti" },
  },
};

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
  kind: BookKind;
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
export type SynapseTag = "ideia" | "estudo";

export interface Synapse {
  id: string;
  title: string; // o "nome" da sinapse, ex.: "Qual o personagem?"
  learning: string; // HTML — o aprendizado em si
  questions: string; // HTML — a(s) pergunta(s) que o aprendizado gera
  source: string | null; // de onde veio (conversa, livro, filme...)
  createdAt: string;
  // "ideia" = insight rápido (voz ou manual): mesma tabela, outra tela. title_auto marca
  // o título que o FARO deu sozinho, para a IA refinar depois.
  kind: "sinapse" | "ideia";
  // Só vale para kind "ideia" (tela Ideias e Estudos): a mesma anotação pode ser uma ideia ou um estudo.
  tag: SynapseTag;
  titleAuto: boolean;
}

// Metanoia: as frases que o FARO traz de volta durante o dia (suas, do seu FARO ou de prints).
// "pendente" espera a aprovação; só "aprovada" entra no sorteio dos lembretes.
export type MetanoiaOrigem = "minha" | "faro" | "print" | "ia";
export type MetanoiaStatus = "pendente" | "aprovada" | "arquivada";
// "pergunta" = pergunta poderosa: chega em horários próprios, sem aspas nem autor.
export type MetanoiaTema = "claro" | "escuro" | "auto";
export type MetanoiaTipo = "frase" | "pergunta";
export interface MetanoiaFrase {
  id: string;
  texto: string;
  autor: string | null;
  fonte: string | null; // de onde veio, ex.: "Valores", "Print do Drive", "Sinapse: Ted Lasso"
  tipo: MetanoiaTipo;
  origem: MetanoiaOrigem;
  origemRef: string | null; // id do item do FARO que originou a frase (evita propor duas vezes)
  status: MetanoiaStatus;
  favorita: boolean;
  createdAt: string;
}

// Uma parte de um Estudo (encontro, aula, módulo, atividade...): cada uma com o próprio texto,
// para o estudo não virar um bloco só de texto. Só existe para sinapses kind "ideia" com tag "estudo".
export interface SynapsePart {
  id: string;
  synapseId: string;
  title: string; // ex.: "Encontro 3"
  kind: string; // livre; sugestões: encontro, aula, módulo, atividade
  date: string | null; // ISO date
  body: string; // HTML
  order: number;
  createdAt: string;
}

// Lista de compras (kind "compra") e lista de desejos (kind "desejo", as oportunidades
// de compra: produto que quer comprar ou comparar um dia, com anotações e links).
export interface ShoppingLink {
  title: string; // ex.: "Compra", "Vídeo do produto", "Avaliação"
  url: string;
}

// Lista de aniversários: amigos, familiares e clientes. O ano é opcional.
export interface BirthdayPhrase {
  titulo: string;
  texto: string;
}

export interface Birthday {
  id: string;
  name: string;
  month: number; // 1 a 12
  day: number; // 1 a 31
  year: number | null; // ano de nascimento, quando se sabe
  category: "cliente" | "amigo" | "familiar";
  phone: string; // pra mandar a mensagem pelo WhatsApp (e, no futuro, o envio automático)
  message: string; // modelo; {nome} vira o primeiro nome. Vazio usa a mensagem padrão.
  autoMessage: boolean; // "mandar mensagem automática" (o envio sozinho ainda não está ligado)
  remind: boolean; // lembrar de mandar uma mensagem mais pessoal (vira lembrete anual)
  remindWhatsapp: boolean; // o mesmo lembrete, também no WhatsApp do Leandro
  noSend: boolean; // "Não enviar": o FARO não manda nenhuma mensagem para esta pessoa
  pending: boolean; // veio do cadastro pelo site e ainda não foi conferido: botão "Confirmar cliente"
  // Rodízio das frases prontas: de qual frase (posição na lista de Aniversários) é a mensagem atual
  // (null = texto próprio, não gira) e qual foi a última enviada e quando. Depois que a frase é
  // enviada, a pessoa passa para a próxima da fila.
  messageSlot: number | null;
  lastSentYear: number | null;
  lastSentSlot: number | null;
  note: string;
  order: number;
}

export interface ShoppingList {
  id: string;
  kind: "compra" | "desejo";
  name: string; // ex.: "Supermercado", "Casa", "Tecnologia"
  order: number;
}

export interface ShoppingItem {
  id: string;
  listId: string | null;
  kind: "compra" | "desejo";
  name: string;
  note: string;
  links: ShoppingLink[];
  done: boolean; // compra: já comprei
  doneOn: string | null;
  repeatDays: number | null; // relembrar de comprar X dias depois de comprar
  remindOn: string | null; // quando lembrar (individual, ou o "de novo" depois de comprar)
  remindTime: string; // "HH:MM"
  whatsapp: boolean;
  inApp: boolean;
  order: number;
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
  // De onde o lembrete veio quando o ícone do zap foi aceso. Null = criado à mão
  // pelo Leandro, e nesse caso nada automático mexe nele.
  sourceKind: "medication" | "maintenance" | "diet_meal" | "event" | "shopping" | "birthday" | null;
  sourceId: string | null;
  // Qual aviso do item de origem este lembrete é (manutenção: comprar, antes,
  // hoje, vencido1..3). Permite ao app atualizar cada um sem duplicar.
  sourceStage?: string | null;
  // false = o aviso só vai pro celular (push/WhatsApp) e não aparece em banner nem na agenda do app.
  inApp?: boolean;
  // Ícone do zap do lembrete. Nasce LIGADO: antes dele, todo lembrete com aviso
  // já ia pro WhatsApp, e desligar por padrão silenciaria tudo sem ninguém pedir.
  whatsapp: boolean;
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
  extraTimes: string[]; // outros horários do mesmo dia, além de `time` ("HH:MM"); ignorado se intervalHours estiver preenchido
  intervalHours: number | null; // "de X em X horas": a partir do primeiro horário, repete a cada X horas dentro do dia
  active: boolean;
  whatsapp: boolean; // ícone do zap aceso = o lembrete desse remédio chega no WhatsApp
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  toBuy: boolean; // precisa comprar antes (ex.: supermercado) — separa da lista de itens pra levar/arrumar
  amountCents?: number | null; // quanto custou/vai custar esse item (opcional); o item marcado entra no gasto do checklist
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
  order: number; // ordem manual na tela — ele arrasta o próximo pro topo
  notes: string; // anotações livres do checklist, em HTML (editor rico), "" = nada
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

// "Conhecendo você": o que a pessoa trouxe da IA dela (ou escreveu) sobre si e sobre o
// que já produziu. Entra para revisão e só conta depois de aprovado.
export interface KnowledgeItem {
  id: string;
  tipo: string; // ver TIPOS_DE_CONHECIMENTO em lib/conhecimento.ts
  titulo: string;
  conteudo: string; // Markdown
  dataRef: string | null;
  origem: string | null;
  tags: string[];
  status: "pendente" | "aprovado" | "descartado";
  fonte: "importacao" | "manual" | "conector";
  lote: string | null;
  createdAt: string;
  updatedAt: string; // última vez que foi editado ou teve o status mudado (aprovado, descartado...)
}

export interface BoardState {
  tasks: Task[];
  taskTimeEntries: TaskTimeEntry[]; // tempo por dia das tarefas
  studyPlans: StudyPlan[];
  taskPostponements: TaskPostponement[];
  maintenanceAssets: MaintenanceAsset[];
  odometerReadings: OdometerReading[];
  maintenanceItems: MaintenanceItem[];
  maintenanceServices: MaintenanceService[];
  trashedTasks: Task[]; // tarefas excluídas (soft delete) — Lixeira
  projects: Project[]; // PDA — planos de ação com tarefas vinculadas como etapas
  habits: RecurringItem[];
  fixedBlocks: RecurringItem[];
  dietMeals: DietMeal[];
  taskSeries: TaskSeries[];
  taskStatuses: TaskStatus[];
  books: Book[];
  synapses: Synapse[];
  synapseParts: SynapsePart[];
  metanoiaFrases: MetanoiaFrase[];
  shoppingItems: ShoppingItem[];
  shoppingLists: ShoppingList[];
  birthdays: Birthday[];
  knowledgeItems: KnowledgeItem[];
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
