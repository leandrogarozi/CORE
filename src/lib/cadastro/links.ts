import type { Json } from "@/lib/database.types";

/**
 * Links de cadastro: um endereço por pessoa (cadastro.leandrogarozi.com.br/<codigo>),
 * com texto e perguntas próprios. Módulo puro: sem rede e sem banco.
 */

export const ENDERECO_DOS_LINKS = "https://cadastro.leandrogarozi.com.br";

export const TIPOS_DE_PERGUNTA = [
  { id: "texto", rotulo: "Texto curto", dica: "Uma linha" },
  { id: "longo", rotulo: "Texto longo", dica: "Parágrafo" },
  { id: "escolha", rotulo: "Múltipla escolha", dica: "Até 10 opções" },
  { id: "links", rotulo: "Links", dica: "Referências" },
  { id: "nota", rotulo: "Nota", dica: "1 a 5 ou 0 a 10" },
] as const;

export const ESCALAS_DE_NOTA = [
  { id: "1-5", rotulo: "1 a 5", min: 1, max: 5 },
  { id: "0-10", rotulo: "0 a 10", min: 0, max: 10 },
] as const;
export const MAXIMO_DE_OPCOES = 10;

export interface Pergunta {
  id: string;
  texto: string;
  /** texto | longo | escolha | links | nota. Qualquer outro valor a página trata como texto curto. */
  tipo: string;
  opcional: boolean;
  /** Observação que aparece abaixo da pergunta. */
  instrucao?: string;
  /** Só em `escolha`: as alternativas (até 10). */
  opcoes?: string[];
  /** Só em `escolha`: acrescenta "Outros" com campo livre. */
  outros?: boolean;
  /** Só em `nota`: "1-5" ou "0-10". */
  escala?: string;
}

/** Minúsculas, sem acento, só letras e números separados por um hífen. */
export function slugDoLink(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 38);
}

/** `witt` + `Flaviana` -> `witt-flaviana`. */
export function codigoDoLink(cliente: string, pessoa: string): string {
  const partes = [slugDoLink(cliente), slugDoLink(pessoa)].filter(Boolean);
  return partes.join("-") || "link";
}

/** Se o código já existe, acrescenta -2, -3... (a pessoa nunca divide link com outra). */
export function codigoLivre(base: string, existentes: Iterable<string>): string {
  const usados = new Set(existentes);
  if (!usados.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${Date.now()}`;
}

export const urlDoLink = (codigo: string) => `${ENDERECO_DOS_LINKS}/${codigo}`;

/** Lê a coluna `perguntas` (JSON de fora do TypeScript) sem confiar no formato. */
export function lerPerguntas(bruto: Json | undefined | null): Pergunta[] {
  if (!Array.isArray(bruto)) return [];
  const saida: Pergunta[] = [];
  const vistos = new Set<string>();
  for (const x of bruto) {
    if (!x || typeof x !== "object" || Array.isArray(x)) continue;
    const o = x as Record<string, Json | undefined>;
    const id = typeof o.id === "string" ? o.id.trim().slice(0, 60) : "";
    const texto = typeof o.texto === "string" ? o.texto.trim().slice(0, 300) : "";
    if (!id || !texto || vistos.has(id)) continue;
    vistos.add(id);
    const tipo = typeof o.tipo === "string" && o.tipo ? o.tipo : "texto";
    const p: Pergunta = { id, texto, tipo, opcional: o.opcional === true };
    if (typeof o.instrucao === "string" && o.instrucao.trim()) p.instrucao = o.instrucao.trim().slice(0, 300);
    if (tipo === "escolha") {
      p.opcoes = (Array.isArray(o.opcoes) ? o.opcoes : [])
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .map((x) => x.trim().slice(0, 200))
        .slice(0, MAXIMO_DE_OPCOES);
      p.outros = o.outros === true;
    }
    if (tipo === "nota") p.escala = o.escala === "0-10" ? "0-10" : "1-5";
    saida.push(p);
  }
  return saida;
}

/** Id estável para uma pergunta nova, a partir do texto (nunca muda depois, mesmo se o texto mudar). */
export function idDaPergunta(texto: string, existentes: Iterable<string>): string {
  const base = slugDoLink(texto).replace(/-/g, "_").slice(0, 30) || "pergunta";
  const usados = new Set(existentes);
  if (!usados.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!usados.has(`${base}_${n}`)) return `${base}_${n}`;
  return `${base}_${Date.now()}`;
}

type Resposta = string | number | boolean | string[];

const vazia = (v: Resposta | undefined) =>
  v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

/**
 * Confere as respostas contra as perguntas do link: guarda só as que são do link
 * (o resto é descartado) e cobra as obrigatórias.
 */
export function respostasDoLink(
  perguntas: Pergunta[],
  enviadas: Record<string, Resposta>
): { ok: true; respostas: Record<string, Resposta> } | { ok: false; campo: string; erro: string } {
  const respostas: Record<string, Resposta> = {};
  for (const p of perguntas) {
    const v = enviadas[p.id];
    if (vazia(v)) {
      if (!p.opcional) return { ok: false, campo: p.id, erro: `Responda: ${p.texto}` };
      continue;
    }
    if (p.tipo === "nota") {
      const escala = ESCALAS_DE_NOTA.find((e) => e.id === p.escala) ?? ESCALAS_DE_NOTA[0];
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
      if (!Number.isInteger(n) || n < escala.min || n > escala.max) {
        return { ok: false, campo: p.id, erro: `Dê uma nota de ${escala.rotulo}: ${p.texto}` };
      }
      respostas[p.id] = n;
      continue;
    }
    if (p.tipo === "escolha" && p.opcoes?.length && !p.outros) {
      const ok = typeof v === "string" && p.opcoes.includes(v);
      if (!ok) return { ok: false, campo: p.id, erro: `Escolha uma das opções: ${p.texto}` };
    }
    respostas[p.id] = v as Resposta;
  }
  return { ok: true, respostas };
}

/** Texto de uma resposta para tela e planilha. */
export function respostaEmTexto(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (Array.isArray(v)) return v.join("; ");
  return String(v);
}
