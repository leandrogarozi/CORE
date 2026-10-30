/**
 * "Criar perguntas poderosas" numa sinapse, ideia ou estudo: a IA lê só aquele texto e devolve
 * perguntas curtas para a pessoa se fazer. Aqui só o pedido e a leitura da resposta; quem chama a
 * API é a rota, que também aplica o teto de gasto.
 */

export const MAX_TOKENS_DAS_PERGUNTAS = 1200;
/** Teto de entrada: ~30 mil caracteres (um texto colado inteiro cabe). */
export const LIMITE_DO_TEXTO = 30_000;
export const MAXIMO_DE_PERGUNTAS = 7;

export const INSTRUCAO_DAS_PERGUNTAS = `Você cria PERGUNTAS PODEROSAS, em português do Brasil, a partir de um texto que a própria pessoa guardou para estudar.

Regras:
- Entre 5 e 7 perguntas, cada uma numa linha começando com "- ". Nada além da lista.
- Perguntas curtas (até 160 caracteres), abertas, na segunda pessoa ("você"), que façam a pessoa olhar para a própria vida, não para o texto. Evite perguntas de sim ou não e perguntas de prova ("o que o autor quis dizer").
- Use SÓ o que está no texto. Não invente fatos, autores nem dados. Se o texto é de outro autor, a pergunta ainda é para a pessoa se perguntar.
- Sem numeração, sem aspas, sem explicação, sem repetir a mesma pergunta com outras palavras.`;

/** Lê a lista que a IA devolve: uma pergunta por linha, com "-", "•", "*" ou número na frente. */
export function lerPerguntas(resposta: string): string[] {
  const vistas = new Set<string>();
  const perguntas: string[] = [];
  for (const linha of resposta.split(/\r?\n/)) {
    const texto = linha
      .replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "")
      .replace(/^["“”']+|["“”']+$/g, "")
      .trim();
    if (texto.length < 8 || texto.length > 300 || !texto.includes("?")) continue;
    const chave = texto.toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    perguntas.push(texto);
    if (perguntas.length >= MAXIMO_DE_PERGUNTAS) break;
  }
  return perguntas;
}
