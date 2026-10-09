import { rotuloDoTipo } from "@/lib/conhecimento";
import type { KnowledgeItem } from "@/lib/types";

/**
 * "O que o FARO sabe sobre você": um texto corrido, escrito pela IA a partir do
 * que a pessoa APROVOU em "Conhecendo você". Aqui só montamos o pedido; quem
 * chama a API é a rota, que também aplica o teto de gasto.
 *
 * O texto guardado vira parte do cérebro: entra no backup (tabela settings),
 * na cópia em Markdown do Drive e no conector (faro_sobre_mim).
 */

export const MAX_TOKENS_DO_RESUMO = 3000;
/** Teto de entrada: ~100 mil caracteres (~30 mil tokens, cerca de R$ 0,35 por resumo). */
const LIMITE_TOTAL = 100_000;
const LIMITE_POR_ITEM = 2500;

// Quem a pessoa é vem antes, para sobrar espaço para o resto caso o acervo seja enorme.
const ORDEM = ["perfil", "valor", "objetivo", "preferencia", "decisao", "projeto", "estudo", "aprendizado", "livro", "conteudo", "ideia", "outro"];

export const INSTRUCAO_DO_RESUMO = `Você escreve, em português do Brasil, o texto "O que o FARO sabe sobre mim" para a pessoa dona dos materiais abaixo. Ela mesma aprovou cada item.

Regras:
- Escreva em TERCEIRA pessoa, em texto corrido organizado por blocos curtos com título (## ...): quem é, o que valoriza e acredita, o que busca (objetivos), como trabalha e decide, projetos e estudos em andamento, o que já produziu, o que dá para saber sobre o jeito de se comunicar.
- Use SÓ o que está nos materiais. Nunca invente, nunca complete com suposição. Se algo não aparece, não mencione.
- Seja objetivo: entre 350 e 700 palavras no total. Frases diretas, sem enfeite, sem elogio.
- Termine com um bloco "## O que ainda não sei" com 3 a 5 lacunas úteis que a pessoa poderia preencher no FARO.
- Não cite títulos de arquivo nem "item", "importação" ou "lote". Fale do conteúdo.`;

export function materiaisParaResumir(itens: KnowledgeItem[]): { texto: string; usados: number; total: number } {
  const aprovados = itens.filter((i) => i.status === "aprovado");
  const peso = (t: string) => {
    const p = ORDEM.indexOf(t);
    return p === -1 ? ORDEM.length : p;
  };
  const ordenados = [...aprovados].sort((a, b) => peso(a.tipo) - peso(b.tipo) || b.createdAt.localeCompare(a.createdAt));
  const blocos: string[] = [];
  let tamanho = 0;
  for (const i of ordenados) {
    const corpo = i.conteudo.trim();
    const bloco = `### ${rotuloDoTipo(i.tipo)}: ${i.titulo}${i.dataRef ? ` (${i.dataRef})` : ""}\n${
      corpo.length > LIMITE_POR_ITEM ? corpo.slice(0, LIMITE_POR_ITEM) + "…" : corpo
    }`;
    if (tamanho + bloco.length > LIMITE_TOTAL) break;
    blocos.push(bloco);
    tamanho += bloco.length;
  }
  return { texto: blocos.join("\n\n"), usados: blocos.length, total: aprovados.length };
}

/** Arquivo em Markdown (com cabeçalho do Obsidian) para a cópia do Drive. */
export function arquivoDoResumo(resumo: string, geradoEm: string | null) {
  const data = (geradoEm ?? new Date().toISOString()).slice(0, 10);
  return {
    nome: "01 — O que o FARO sabe sobre você.md",
    conteudo: `---\ntipo: resumo\ndata: ${data}\norigem: FARO\n---\n\n# O que o FARO sabe sobre você\n\nResumo escrito pela IA com base no que você aprovou em "Conhecendo você". Gerado em ${data}.\n\n${resumo.trim()}\n`,
  };
}
