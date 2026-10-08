import type Anthropic from "@anthropic-ai/sdk";
import { MOOD_EMOTIONS } from "@/lib/mood";

/**
 * O que o FARO sabe FAZER por voz ou texto. A IA só PROPÕE: a ação volta para a
 * tela como um cartão com o que vai acontecer, e só grava depois do OK dele
 * (decisão do plano: nada é executado sem confirmação).
 *
 * Este módulo é puro e vive nos dois lados: o servidor define as ferramentas e
 * valida o que a IA propôs; a tela valida de novo antes de gravar. Entrada ruim
 * (data inventada, hora fora do relógio, valor negativo) nunca chega ao banco.
 */

export type AcaoProposta =
  | { tipo: "criar_lembrete"; titulo: string; data: string; hora: string; observacao: string | null }
  | {
      tipo: "criar_tarefa";
      titulo: string;
      data: string | null;
      hora: string | null;
      prioridade: "alta" | "media" | "baixa" | null;
      observacao: string | null;
    }
  | { tipo: "anotar_gasto"; checklist: string; descricao: string; valorCentavos: number; data: string | null }
  | { tipo: "registrar_humor"; nivel: 1 | 2 | 3 | 4 | 5; emocao: string | null };

export const FERRAMENTAS_DO_FARO: Anthropic.Tool[] = [
  {
    name: "criar_lembrete",
    description:
      "Cria um lembrete que avisa em uma data e hora. Use quando ele pedir para lembrar de algo. Data e hora são obrigatórias: se faltar a hora, pergunte antes de chamar.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "O que lembrar, curto. Ex.: 'Ligar para o Bruno'." },
        data: { type: "string", description: "Data no formato AAAA-MM-DD, já resolvida a partir da data de hoje." },
        hora: { type: "string", description: "Hora no formato HH:MM (24h)." },
        observacao: { type: "string", description: "Detalhe opcional." },
      },
      required: ["titulo", "data", "hora"],
    },
  },
  {
    name: "criar_tarefa",
    description:
      "Cria uma tarefa na lista. Sem data, vai para o backlog (tarefas sem data). Use quando ele pedir para anotar algo a fazer.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "A tarefa, no imperativo e curta." },
        data: { type: "string", description: "AAAA-MM-DD. Omita se ele não disse quando." },
        hora: { type: "string", description: "HH:MM (24h), só se ele disse o horário." },
        prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
        observacao: { type: "string" },
      },
      required: ["titulo"],
    },
  },
  {
    name: "anotar_gasto",
    description:
      "Anota um gasto na aba Gastos de um checklist (ex.: uma viagem). O checklist precisa ter a aba de Gastos ligada; use o nome exatamente como aparece na lista CHECKLISTS.",
    input_schema: {
      type: "object",
      properties: {
        checklist: { type: "string", description: "Nome do checklist, como aparece em CHECKLISTS." },
        descricao: { type: "string", description: "No que foi gasto. Ex.: 'Gasolina', 'Hotel'." },
        valor_reais: { type: "number", description: "Valor em reais, ex.: 87.5." },
        data: { type: "string", description: "AAAA-MM-DD. Omita para usar hoje." },
      },
      required: ["checklist", "descricao", "valor_reais"],
    },
  },
  {
    name: "registrar_humor",
    description: "Registra o humor de HOJE no registro do dia, quando ele disser como está se sentindo.",
    input_schema: {
      type: "object",
      properties: {
        nivel: { type: "integer", minimum: 1, maximum: 5, description: "1 péssimo, 2 ruim, 3 neutro, 4 bom, 5 ótimo." },
        emocao: { type: "string", enum: MOOD_EMOTIONS.map((m) => m.v), description: "Emoção do dia, se ele disser." },
      },
      required: ["nivel"],
    },
  },
];

const texto = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};

/** AAAA-MM-DD que existe de verdade (30/02 não passa). */
export function dataValida(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}

export function horaValida(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export type ResultadoDaValidacao = { ok: true; acao: AcaoProposta } | { ok: false; motivo: string };

export function validarAcao(nome: string, entrada: unknown): ResultadoDaValidacao {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  switch (nome) {
    case "criar_lembrete": {
      const titulo = texto(e.titulo, 200);
      const data = dataValida(e.data);
      const hora = horaValida(e.hora);
      if (!titulo) return { ok: false, motivo: "faltou o título do lembrete" };
      if (!data || !hora) return { ok: false, motivo: "lembrete precisa de data e hora válidas" };
      return { ok: true, acao: { tipo: "criar_lembrete", titulo, data, hora, observacao: texto(e.observacao, 500) } };
    }
    case "criar_tarefa": {
      const titulo = texto(e.titulo, 200);
      if (!titulo) return { ok: false, motivo: "faltou o título da tarefa" };
      const prioridade = e.prioridade === "alta" || e.prioridade === "media" || e.prioridade === "baixa" ? e.prioridade : null;
      return {
        ok: true,
        acao: {
          tipo: "criar_tarefa",
          titulo,
          data: dataValida(e.data),
          hora: horaValida(e.hora),
          prioridade,
          observacao: texto(e.observacao, 500),
        },
      };
    }
    case "anotar_gasto": {
      const checklist = texto(e.checklist, 120);
      const descricao = texto(e.descricao, 120);
      const valor = typeof e.valor_reais === "number" ? e.valor_reais : Number.NaN;
      if (!checklist || !descricao) return { ok: false, motivo: "faltou o checklist ou a descrição do gasto" };
      if (!Number.isFinite(valor) || valor <= 0 || valor > 10_000_000) return { ok: false, motivo: "valor do gasto inválido" };
      return {
        ok: true,
        acao: { tipo: "anotar_gasto", checklist, descricao, valorCentavos: Math.round(valor * 100), data: dataValida(e.data) },
      };
    }
    case "registrar_humor": {
      const nivel = typeof e.nivel === "number" ? Math.round(e.nivel) : 0;
      if (nivel < 1 || nivel > 5) return { ok: false, motivo: "nível de humor deve ser de 1 a 5" };
      const emocao = MOOD_EMOTIONS.some((m) => m.v === e.emocao) ? (e.emocao as string) : null;
      return { ok: true, acao: { tipo: "registrar_humor", nivel: nivel as 1 | 2 | 3 | 4 | 5, emocao } };
    }
    default:
      return { ok: false, motivo: `ferramenta desconhecida: ${nome}` };
  }
}

const dataBr = (iso: string) => iso.split("-").reverse().join("/");
const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const NIVEIS = ["", "péssimo", "ruim", "neutro", "bom", "ótimo"];

/** A frase do cartão de confirmação: o que VAI acontecer se ele aceitar. */
export function descreverAcao(a: AcaoProposta): string {
  switch (a.tipo) {
    case "criar_lembrete":
      return `Criar lembrete: ${a.titulo}, em ${dataBr(a.data)} às ${a.hora}`;
    case "criar_tarefa":
      return `Criar tarefa: ${a.titulo}${a.data ? `, para ${dataBr(a.data)}` : " (sem data)"}${a.hora ? ` às ${a.hora}` : ""}`;
    case "anotar_gasto":
      return `Anotar gasto em "${a.checklist}": ${a.descricao}, ${reais(a.valorCentavos)}${a.data ? ` (${dataBr(a.data)})` : ""}`;
    case "registrar_humor":
      return `Registrar o humor de hoje: ${NIVEIS[a.nivel]}${a.emocao ? ` (${a.emocao.replace("_", " ")})` : ""}`;
  }
}
