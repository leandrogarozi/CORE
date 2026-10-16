import { lembreteDoAniversario, MESES } from "@/lib/board/aniversarios";
import { dateFromISO } from "@/lib/date-utils";
import { TIPOS_DE_CONHECIMENTO, normalizarTipo } from "@/lib/conhecimento";
import { CATEGORY_LABEL, type Birthday, type Category, type Priority, type Reminder, type Task } from "@/lib/types";

/**
 * Escrita do conector FARO: a IA cria aniversários, tarefas e lembretes.
 *
 * Duas regras que não se negociam:
 *
 * 1. **Só grava depois de confirmar.** Toda ferramenta de escrita tem uma
 *    primeira chamada que NÃO grava: devolve a prévia do que vai ser criado. A IA
 *    mostra ao Leandro, ele diz que sim, e só aí a IA repete a chamada com
 *    `confirmado: true`. A confirmação é exigida aqui no servidor, não só pedida
 *    no texto da ferramenta, então uma IA distraída não consegue pular a etapa.
 * 2. **Só cria.** Nada aqui edita ou apaga o que já existe. O pior que uma
 *    conversa errada faz é criar um item a mais, que ele apaga na tela.
 *
 * Módulo puro: quem fala com o banco é o `Repositorio`, entregue pela rota. É
 * isso que deixa testar tudo com dados de mentira.
 */

export interface Repositorio {
  aniversariosExistentes(): Promise<{ name: string; month: number; day: number }[]>;
  inserirAniversario(b: Birthday, lembrete: Reminder | null): Promise<void>;
  /** Os dois status que uma tarefa nova pode ter: o de trabalho e o de "agendado". */
  statusDasTarefas(): Promise<{ padrao: string | null; agendado: string | null }>;
  proximaOrdem(data: string | null): Promise<number>;
  inserirTarefa(t: Task): Promise<void>;
  inserirLembrete(r: Reminder): Promise<void>;
  /** "tipo|título" (normalizado) dos itens de Conhecendo você que não foram descartados. */
  conhecimentoExistente(): Promise<{ tipo: string; titulo: string }[]>;
  inserirConhecimento(
    itens: { id: string; tipo: string; titulo: string; conteudo: string; dataRef: string | null; origem: string | null; tags: string[] }[]
  ): Promise<void>;
}

export interface Contexto {
  hoje: string; // AAAA-MM-DD na zona do Leandro
  novoId: () => string;
}

type Args = Record<string, unknown>;
/** `aviso`: o que o FARO manda de push ao Leandro quando algo foi gravado por aqui. */
export type Resposta = { texto: string; erro?: boolean; aviso?: { titulo: string; corpo: string; destino: string } };

export const NOMES_DAS_FERRAMENTAS_DE_ESCRITA = [
  "faro_criar_aniversarios",
  "faro_criar_tarefas",
  "faro_criar_lembretes",
  "faro_propor_aprendizado",
] as const;

export function ehFerramentaDeEscrita(nome: string): boolean {
  return (NOMES_DAS_FERRAMENTAS_DE_ESCRITA as readonly string[]).includes(nome);
}

const CONFIRMACAO = {
  confirmado: {
    type: "boolean",
    description:
      "Deixe de fora (ou false) na primeira chamada: nada é gravado e você recebe a prévia. Só mande true DEPOIS de mostrar a prévia ao Leandro e ele dizer que pode gravar.",
  },
} as const;

const CATEGORIAS = Object.keys(CATEGORY_LABEL) as Category[];

export const FERRAMENTAS_DE_ESCRITA = [
  {
    name: "faro_criar_aniversarios",
    title: "Adicionar aniversários",
    description:
      "Adiciona pessoas à lista de Aniversários do FARO (um ou vários de uma vez). Fluxo obrigatório em 2 passos: 1) chame sem 'confirmado' e mostre ao Leandro a prévia que voltar; 2) com o ok dele, chame de novo com os mesmos dados e confirmado=true. Já cria o lembrete anual das 9h. Pessoa que já está na lista é pulada, nunca duplicada. Ano de nascimento é opcional; se ele não disse, não invente.",
    inputSchema: {
      type: "object",
      properties: {
        pessoas: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              dia: { type: "integer", minimum: 1, maximum: 31 },
              mes: { type: "integer", minimum: 1, maximum: 12 },
              ano: { type: "integer", description: "Ano de nascimento, só se ele informou." },
              categoria: { type: "string", enum: ["cliente", "amigo", "familiar"], description: "Padrão: amigo." },
              telefone: { type: "string", description: "Opcional, com DDD." },
              lembrar_no_whatsapp: {
                type: "boolean",
                description: "Se true, o lembrete das 9h também chega no WhatsApp dele. Padrão: false.",
              },
            },
            required: ["nome", "dia", "mes"],
            additionalProperties: false,
          },
        },
        ...CONFIRMACAO,
      },
      required: ["pessoas"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "faro_criar_tarefas",
    title: "Criar tarefas",
    description:
      "Cria tarefas no FARO (uma ou várias). Serve para qualquer coisa que ele peça para anotar: 'gastei X no cartão Y, sobe o arquivo', 'ligar para fulano amanhã', reunião marcada. Fluxo obrigatório em 2 passos: 1) chame sem 'confirmado' e mostre a prévia ao Leandro; 2) com o ok dele, chame de novo com os mesmos dados e confirmado=true. Use a data de hoje informada nas instruções para calcular 'amanhã', 'sexta' etc. Não cria anexos: se houver arquivo, ponha o nome/descrição na nota e avise que o arquivo ele sobe na tarefa.",
    inputSchema: {
      type: "object",
      properties: {
        tarefas: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              data: { type: "string", description: "AAAA-MM-DD. Sem data a tarefa vai para o Backlog." },
              hora: { type: "string", description: "HH:MM, só se ele disse a hora. Com hora vira compromisso agendado." },
              prioridade: { type: "string", enum: ["alta", "media", "baixa"], description: "Padrão: media." },
              tag: { type: "string", enum: CATEGORIAS, description: "Tag da tarefa. Padrão: sem_categoria. 'reuniao' entra na lista de Reuniões." },
              cliente: { type: "string" },
              nota: { type: "string", description: "Detalhes: valores, cartão, o que falta fazer." },
            },
            required: ["titulo"],
            additionalProperties: false,
          },
        },
        ...CONFIRMACAO,
      },
      required: ["tarefas"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "faro_criar_lembretes",
    title: "Criar lembretes",
    description:
      "Cria lembretes avulsos no FARO, com dia e hora (push dentro do app; WhatsApp só se ele pedir). Fluxo obrigatório em 2 passos: 1) chame sem 'confirmado' e mostre a prévia ao Leandro; 2) com o ok dele, chame de novo com os mesmos dados e confirmado=true.",
    inputSchema: {
      type: "object",
      properties: {
        lembretes: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              data: { type: "string", description: "AAAA-MM-DD." },
              hora: { type: "string", description: "HH:MM." },
              repetir: { type: "string", enum: ["nao", "diario", "semanal", "mensal", "anual"], description: "Padrão: nao." },
              whatsapp: { type: "boolean", description: "Também avisar no WhatsApp 10 min antes. Padrão: false." },
            },
            required: ["titulo", "data", "hora"],
            additionalProperties: false,
          },
        },
        ...CONFIRMACAO,
      },
      required: ["lembretes"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "faro_propor_aprendizado",
    title: "Propor aprendizado ao FARO",
    description:
      "Envia ao FARO o que você aprendeu sobre o Leandro nas conversas (perfil, valor, objetivo, preferência, decisão, projeto, aprendizado...). Vai como PROPOSTA: cai na aba 'Para revisar' de 'Conhecendo você' e o FARO avisa o Leandro; só vale depois que ele aprovar. Use quando ele revelar algo novo e durável sobre si, ou quando decidir algo importante. Não repita o que já existe (use faro_buscar antes), não invente, use as palavras dele, e nunca envie saúde, medicamentos, senhas ou dados bancários. Depois de enviar, diga a ele em uma linha o que você propôs.",
    inputSchema: {
      type: "object",
      properties: {
        itens: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: TIPOS_DE_CONHECIMENTO.map((t) => t.id) },
              titulo: { type: "string", description: "Título curto e específico." },
              conteudo: { type: "string", description: "O aprendizado, em Markdown, com as palavras dele quando possível." },
              data: { type: "string", description: "AAAA-MM-DD de quando surgiu, se souber." },
              tags: { type: "array", items: { type: "string" } },
              origem: { type: "string", description: "De que conversa ou assunto veio. Ex.: 'conversa no Claude sobre o funil'." },
            },
            required: ["tipo", "titulo", "conteudo"],
            additionalProperties: false,
          },
        },
      },
      required: ["itens"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

// ---------------------------------------------------------------------------
// Utilidades

const DIAS_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const ehData = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dateFromISO(s).getTime()) && dateFromISO(s).getDate() === Number(s.slice(8, 10));
const ehHora = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** "terça, 20/10/2026": o dia da semana junto deixa o erro de data saltar aos olhos na prévia. */
export function dataPorExtenso(iso: string): string {
  const d = dateFromISO(iso);
  return `${DIAS_DA_SEMANA[d.getDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

const PRIMEIRO_PASSO =
  "\n\nNADA FOI GRAVADO ainda. Mostre esta prévia ao Leandro e pergunte se pode gravar. Com o ok dele, chame a mesma ferramenta de novo com os mesmos dados e confirmado=true.";

function resultado(linhasOk: string[], problemas: string[], confirmado: boolean, cabecalho: string): Resposta {
  const partes: string[] = [];
  if (linhasOk.length) partes.push(`${cabecalho}:`, ...linhasOk);
  if (problemas.length) partes.push("", "Problemas (estes NÃO entram):", ...problemas.map((p) => `- ${p}`));
  if (!linhasOk.length) return { texto: partes.join("\n") || "Nada para criar.", erro: true };
  return { texto: partes.join("\n") + (confirmado ? "" : PRIMEIRO_PASSO) };
}

function lista<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ---------------------------------------------------------------------------
// Aniversários

export async function criarAniversarios(args: Args, repo: Repositorio, ctx: Contexto): Promise<Resposta> {
  const confirmado = args.confirmado === true;
  const existentes = await repo.aniversariosExistentes();
  const jaTem = new Set(existentes.map((e) => semAcento(e.name)));
  let ordem = existentes.length;
  const ok: { b: Birthday; zap: boolean; linha: string }[] = [];
  const problemas: string[] = [];

  for (const [i, bruto] of lista<Args>(args.pessoas).entries()) {
    const nome = texto(bruto.nome);
    const dia = Math.round(Number(bruto.dia));
    const mes = Math.round(Number(bruto.mes));
    const ano = bruto.ano === undefined || bruto.ano === null || bruto.ano === "" ? null : Math.round(Number(bruto.ano));
    const rotulo = nome || `item ${i + 1}`;
    if (!nome) {
      problemas.push(`${rotulo}: falta o nome.`);
      continue;
    }
    if (!(mes >= 1 && mes <= 12) || !(dia >= 1 && dia <= 31)) {
      problemas.push(`${nome}: dia/mês inválidos.`);
      continue;
    }
    if (ano !== null && !(ano >= 1900 && ano <= 2100)) {
      problemas.push(`${nome}: ano inválido (use 1900 a 2100 ou deixe de fora).`);
      continue;
    }
    if (jaTem.has(semAcento(nome))) {
      problemas.push(`${nome}: já está na lista de aniversários (não duplico).`);
      continue;
    }
    jaTem.add(semAcento(nome));
    const categoria = bruto.categoria === "cliente" || bruto.categoria === "familiar" ? bruto.categoria : "amigo";
    const zap = bruto.lembrar_no_whatsapp === true;
    const b: Birthday = {
      id: ctx.novoId(),
      name: nome,
      month: mes,
      day: dia,
      year: ano,
      category: categoria,
      phone: texto(bruto.telefone),
      message: "",
      autoMessage: false,
      remind: true,
      remindWhatsapp: zap,
      note: "",
      order: ordem++,
    };
    ok.push({
      b,
      zap,
      linha: `- ${nome}: ${dia} de ${MESES[mes - 1]}${ano ? ` de ${ano}` : ""} · ${categoria}${b.phone ? ` · ${b.phone}` : ""}${zap ? " · lembrete também no WhatsApp" : ""}`,
    });
  }

  if (confirmado) {
    for (const { b, zap } of ok) {
      const campos = lembreteDoAniversario(b, ctx.hoje);
      const lembrete: Reminder | null = campos
        ? {
            id: ctx.novoId(),
            title: campos.title,
            date: campos.date,
            time: campos.time,
            repeat: "yearly",
            weekDays: null,
            alertMinutesBefore: zap ? 10 : null,
            note: null,
            done: false,
            status: "pending",
            deletedAt: null,
            taskId: null,
            sourceKind: "birthday",
            sourceId: b.id,
            sourceStage: "item",
            inApp: true,
            whatsapp: zap,
          }
        : null;
      await repo.inserirAniversario(b, lembrete);
    }
  }
  const cab = confirmado ? `Gravado no FARO (${ok.length})` : `Prévia: ${ok.length} aniversário(s) a adicionar, com lembrete anual às 9h`;
  const r = resultado(ok.map((x) => x.linha), problemas, confirmado, cab);
  if (confirmado && ok.length) r.aviso = {
      titulo: "A IA adicionou aniversários",
      corpo: `${ok.map((x) => x.b.name).join(", ")}. Está na lista de Aniversários, com lembrete às 9h no dia. Se não era isso, é só excluir lá.`,
      destino: "aniversarios",
    };
  return r;
}

// ---------------------------------------------------------------------------
// Tarefas

export async function criarTarefas(args: Args, repo: Repositorio, ctx: Contexto): Promise<Resposta> {
  const confirmado = args.confirmado === true;
  const ok: { t: Task; linha: string }[] = [];
  const problemas: string[] = [];
  const status = await repo.statusDasTarefas();
  const ordemPorData = new Map<string, number>();

  for (const [i, bruto] of lista<Args>(args.tarefas).entries()) {
    const titulo = texto(bruto.titulo);
    const rotulo = titulo || `item ${i + 1}`;
    const data = texto(bruto.data);
    const hora = texto(bruto.hora);
    if (!titulo) {
      problemas.push(`${rotulo}: falta o título.`);
      continue;
    }
    if (data && !ehData(data)) {
      problemas.push(`${titulo}: data inválida "${data}" (use AAAA-MM-DD).`);
      continue;
    }
    if (hora && !ehHora(hora)) {
      problemas.push(`${titulo}: hora inválida "${hora}" (use HH:MM).`);
      continue;
    }
    if (hora && !data) {
      problemas.push(`${titulo}: hora sem data. Diga o dia ou tire a hora.`);
      continue;
    }
    const prioridade: Priority = bruto.prioridade === "alta" || bruto.prioridade === "baixa" ? bruto.prioridade : "media";
    const tag = CATEGORIAS.includes(bruto.tag as Category) ? (bruto.tag as Category) : "sem_categoria";
    const cliente = texto(bruto.cliente) || null;
    const nota = texto(bruto.nota);

    const chave = data || "";
    const base = ordemPorData.get(chave) ?? (confirmado ? await repo.proximaOrdem(data || null) : 0);
    ordemPorData.set(chave, base + 1);

    const comHora = !!hora;
    const t: Task = {
      id: ctx.novoId(),
      code: "",
      title: titulo,
      // Reunião é a "segunda tag" (como na tela Reuniões); as outras são a tag principal.
      category: tag === "reuniao" ? "sem_categoria" : tag,
      category2: tag === "reuniao" ? "reuniao" : null,
      priority: prioridade,
      date: data || null,
      time: hora,
      endDate: null,
      endTime: null,
      durationMin: null,
      expectedDurationMin: null,
      note: nota ? `<p>${nota.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>` : "",
      done: false,
      order: base,
      seriesId: null,
      studyPlanId: null,
      challenging: false,
      follows: false,
      isEvent: comHora && tag === "reuniao",
      trackedSeconds: 0,
      quick: 0,
      statusId: comHora && status.agendado ? status.agendado : status.padrao,
      deletedAt: null,
      projectId: null,
      client: cliente,
    };
    ok.push({
      t,
      linha: `- ${titulo} · ${data ? `${dataPorExtenso(data)}${hora ? ` às ${hora}` : ""}` : "sem data (Backlog)"} · prioridade ${prioridade}${tag !== "sem_categoria" ? ` · tag ${CATEGORY_LABEL[tag]}` : ""}${cliente ? ` · cliente ${cliente}` : ""}${nota ? `\n    nota: ${nota}` : ""}`,
    });
  }

  if (confirmado) for (const { t } of ok) await repo.inserirTarefa(t);
  const cab = confirmado ? `Gravado no FARO (${ok.length} tarefa(s))` : `Prévia: ${ok.length} tarefa(s) a criar`;
  const r = resultado(ok.map((x) => x.linha), problemas, confirmado, cab);
  if (confirmado && ok.length) r.aviso = {
      titulo: "A IA criou tarefas no FARO",
      corpo: `${ok.map((x) => x.t.title).join(", ")}. Estão na lista de tarefas, no dia combinado (ou no Backlog, se não tinham data). Se não era isso, é só excluir.`,
      destino: "day",
    };
  return r;
}

// ---------------------------------------------------------------------------
// Lembretes

const REPETICAO: Record<string, Reminder["repeat"]> = {
  nao: "none",
  diario: "daily",
  semanal: "weekly",
  mensal: "monthly",
  anual: "yearly",
};

export async function criarLembretes(args: Args, repo: Repositorio, ctx: Contexto): Promise<Resposta> {
  const confirmado = args.confirmado === true;
  const ok: { r: Reminder; linha: string }[] = [];
  const problemas: string[] = [];

  for (const [i, bruto] of lista<Args>(args.lembretes).entries()) {
    const titulo = texto(bruto.titulo);
    const data = texto(bruto.data);
    const hora = texto(bruto.hora);
    const rotulo = titulo || `item ${i + 1}`;
    if (!titulo) {
      problemas.push(`${rotulo}: falta o título.`);
      continue;
    }
    if (!ehData(data) || !ehHora(hora)) {
      problemas.push(`${titulo}: lembrete precisa de data (AAAA-MM-DD) e hora (HH:MM) válidas.`);
      continue;
    }
    const repeat = REPETICAO[texto(bruto.repetir)] ?? "none";
    const zap = bruto.whatsapp === true;
    const r: Reminder = {
      id: ctx.novoId(),
      title: titulo,
      date: data,
      time: hora,
      repeat,
      weekDays: null,
      alertMinutesBefore: zap ? 10 : null,
      note: null,
      done: false,
      status: "pending",
      deletedAt: null,
      taskId: null,
      sourceKind: null,
      sourceId: null,
      sourceStage: null,
      inApp: true,
      whatsapp: zap,
    };
    ok.push({
      r,
      linha: `- ${titulo} · ${dataPorExtenso(data)} às ${hora}${repeat !== "none" ? ` · repete: ${texto(bruto.repetir)}` : ""}${zap ? " · também no WhatsApp" : ""}`,
    });
  }

  if (confirmado) for (const { r } of ok) await repo.inserirLembrete(r);
  const cab = confirmado ? `Gravado no FARO (${ok.length} lembrete(s))` : `Prévia: ${ok.length} lembrete(s) a criar`;
  const r = resultado(ok.map((x) => x.linha), problemas, confirmado, cab);
  if (confirmado && ok.length) r.aviso = {
      titulo: "A IA criou lembretes no FARO",
      corpo: `${ok.map((x) => x.r.title).join(", ")}. Estão em Lembretes. Se não era isso, é só excluir.`,
      destino: "reminders",
    };
  return r;
}

// ---------------------------------------------------------------------------
// Propostas de aprendizado (vão para "Para revisar", nunca direto para valer)

const PALAVRAS_DE_SAUDE = /(medicament|rem[eé]dio|rosuvastatina|dosagem|diagn[oó]stic|receita m[eé]dica|\bsenha\b|cart[aã]o de cr[eé]dito|\bcpf\b)/i;

export async function proporAprendizado(args: Args, repo: Repositorio, ctx: Contexto): Promise<Resposta> {
  const semAcentoMin = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  const chave = (tipo: string, titulo: string) => `${tipo}|${semAcentoMin(titulo)}`;
  const ja = new Set((await repo.conhecimentoExistente()).map((k) => chave(k.tipo, k.titulo)));
  const novos: Parameters<Repositorio["inserirConhecimento"]>[0] = [];
  const problemas: string[] = [];

  for (const [i, bruto] of lista<Args>(args.itens).entries()) {
    const titulo = texto(bruto.titulo).slice(0, 300);
    const conteudo = texto(bruto.conteudo);
    const tipo = normalizarTipo(texto(bruto.tipo));
    const rotulo = titulo || `item ${i + 1}`;
    if (!titulo || !conteudo) {
      problemas.push(`${rotulo}: falta título ou conteúdo.`);
      continue;
    }
    // Saúde e dados sensíveis nunca entram no cérebro do FARO por aqui.
    if (PALAVRAS_DE_SAUDE.test(`${titulo} ${conteudo}`)) {
      problemas.push(`${titulo}: parece conter saúde, medicamento, senha ou dado bancário. Isso não vai para o FARO.`);
      continue;
    }
    if (ja.has(chave(tipo, titulo))) {
      problemas.push(`${titulo}: já existe no FARO (mesmo tipo e título).`);
      continue;
    }
    ja.add(chave(tipo, titulo));
    const data = texto(bruto.data);
    novos.push({
      id: ctx.novoId(),
      tipo,
      titulo,
      conteudo,
      dataRef: ehData(data) ? data : null,
      origem: texto(bruto.origem) || "conector (IA)",
      tags: lista<unknown>(bruto.tags).map((t) => texto(t)).filter(Boolean).slice(0, 10),
    });
  }

  if (!novos.length) return { texto: ["Nada foi enviado.", ...problemas.map((p) => `- ${p}`)].join("\n"), erro: true };
  await repo.inserirConhecimento(novos);
  const linhas = novos.map((n) => `- [${n.tipo}] ${n.titulo}`);
  return {
    texto: [
      `Enviado ao FARO como PROPOSTA (${novos.length}). Está na aba "Para revisar" de "Conhecendo você"; só vale depois que o Leandro aprovar, e o FARO já avisou ele.`,
      ...linhas,
      ...(problemas.length ? ["", "Não enviados:", ...problemas.map((p) => `- ${p}`)] : []),
    ].join("\n"),
    aviso: {
      titulo: novos.length === 1 ? "Tem 1 aprendizado novo para você aprovar" : `Tem ${novos.length} aprendizados novos para você aprovar`,
      corpo: `A IA propôs: ${novos.map((n) => `"${n.titulo}"`).join(", ")}. Abra Conhecendo você → aba Para revisar para aprovar, editar ou descartar. Nada vale antes da sua aprovação.`,
      destino: "conhecendo",
    },
  };
}

export async function executarEscrita(nome: string, args: Args, repo: Repositorio, ctx: Contexto): Promise<Resposta> {
  switch (nome) {
    case "faro_criar_aniversarios":
      return criarAniversarios(args, repo, ctx);
    case "faro_criar_tarefas":
      return criarTarefas(args, repo, ctx);
    case "faro_criar_lembretes":
      return criarLembretes(args, repo, ctx);
    case "faro_propor_aprendizado":
      return proporAprendizado(args, repo, ctx);
    default:
      return { texto: `Ferramenta desconhecida: ${nome}`, erro: true };
  }
}
