import type { Json } from "@/lib/database.types";

/**
 * Links de cadastro: um endereço por pessoa (cadastro.leandrogarozi.com.br/<codigo>),
 * com texto e perguntas próprios. Módulo puro: sem rede e sem banco.
 */

export const ENDERECO_DOS_LINKS = "https://cadastro.leandrogarozi.com.br";

export const TIPOS_DE_PERGUNTA = [
  { id: "texto", rotulo: "Resposta curta" },
  { id: "longo", rotulo: "Resposta longa" },
  { id: "numero", rotulo: "Número" },
  { id: "sim_nao", rotulo: "Sim ou não" },
  { id: "data", rotulo: "Data" },
] as const;

export interface Pergunta {
  id: string;
  texto: string;
  tipo: string;
  opcional: boolean;
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
    saida.push({ id, texto, tipo: typeof o.tipo === "string" && o.tipo ? o.tipo : "texto", opcional: o.opcional === true });
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
