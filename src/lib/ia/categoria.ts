/**
 * Categoria das anotações: a IA lê só o texto de cada anotação e devolve UMA palavra de assunto
 * (Piscina, Jogos, Família...). Aqui ficam o pedido, a leitura da resposta e a trava de saúde:
 * texto que fala de remédio ou saúde NUNCA vai para a IA, a categoria sai daqui mesmo ("Saúde").
 */

export const MAX_TOKENS_DA_CATEGORIA = 600;
export const MAXIMO_DE_NOTAS_POR_PEDIDO = 12;
export const CATEGORIA_DE_SAUDE = "Saúde";

export const INSTRUCAO_DA_CATEGORIA = `Você dá uma CATEGORIA para cada anotação curta de uma pessoa, em português do Brasil.

Regras:
- A categoria é UMA palavra (no máximo duas), com a primeira letra maiúscula, como um assunto de gaveta: Piscina, Jogos, Família, Casa, Carro, Trabalho, Ideias, Compras, Viagem.
- Você recebe a lista "Categorias que ela já usa". Reaproveite uma delas sempre que servir. Só crie uma nova se nenhuma servir.
- Pense em poucas categorias gerais, não em uma por anotação.
- Responda uma linha por anotação, no formato: numero|Categoria. Nada além disso.`;

/** Texto que fala de saúde/remédio: fica fora da IA. */
const SAUDE = /rem[eé]dio|medic|receita m[eé]dica|comprimido|c[aá]psula|dose|pressão|diabet|consulta|exame|m[eé]dic[oa]|dentista|psic[oó]log|terapia|sintoma|dor de|cirurgia|vacina|alergia|sa[uú]de/i;
export function pareceSaude(texto: string): boolean {
  return SAUDE.test(texto);
}

/** Limpa uma categoria vinda da IA ou digitada: 1 ou 2 palavras, sem símbolos, primeira letra maiúscula. */
export function limparCategoria(bruta: string): string {
  const t = bruta
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ")
    .slice(0, 24);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/** Lê as linhas "numero|Categoria". Devolve só as que têm número conhecido e categoria válida. */
export function lerCategorias(saida: string, ids: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (const linha of saida.split("\n")) {
    const m = linha.match(/^\s*(\d+)\s*[|:.-]\s*(.+)$/);
    if (!m) continue;
    const id = ids[Number(m[1]) - 1];
    const cat = limparCategoria(m[2]);
    if (id && cat) r[id] = cat;
  }
  return r;
}
