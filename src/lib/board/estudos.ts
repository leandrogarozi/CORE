import type { SynapsePart } from "@/lib/types";

/** Tipos sugeridos para uma parte de estudo; o nome é livre, o tipo só ajuda a achar. */
export const TIPOS_DE_PARTE = ["Encontro", "Aula", "Módulo", "Atividade", "Outro"] as const;

/** Roteiro opcional: três títulos para a pessoa preencher (ou apagar e escrever livre). */
export const ROTEIRO_DA_PARTE =
  "<p><strong>O que vi</strong></p><p></p><p><strong>Atividade</strong></p><p></p><p><strong>O que vou aplicar</strong></p><p></p>";

/** "Encontro 3" para o próximo encontro, contando as partes do mesmo tipo que já existem. */
export function proximoNomeDeParte(tipo: string, partes: Pick<SynapsePart, "kind" | "title">[]): string {
  if (tipo === "Outro") return "";
  const k = tipo.toLowerCase();
  const n = partes.filter((p) => p.kind === k).length + 1;
  return `${tipo} ${n}`;
}

/** Nome de arquivo seguro para uma parte: "01 - Encontro 1". */
export function nomeDoArquivoDaParte(ordem: number, titulo: string): string {
  const limpo = titulo.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Parte";
  return `${String(ordem).padStart(2, "0")} - ${limpo}`;
}
