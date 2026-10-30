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
- Sem numeração, sem aspas, sem explicação, sem repetir a mesma pergunta com outras palavras.
- Você recebe também a lista "Perguntas que a pessoa já tem". NÃO crie nenhuma pergunta com o mesmo sentido, a mesma reflexão ou o mesmo foco de uma delas, mesmo com palavras diferentes. A ideia não é acumular perguntas: só crie uma pergunta se ela abrir uma reflexão que as que já existem não abrem. Pode devolver menos de 5, até uma só.
- Se nada do texto abre uma reflexão nova, responda apenas: NENHUMA`;

/** Perguntas já existentes que seguem para a IA (as mais recentes): limita o tamanho do pedido. */
export const MAXIMO_DE_EXISTENTES = 150;

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

/** Tira de um texto livre (campo de perguntas da sinapse, em HTML ou não) cada frase terminada em "?". */
export function extrairPerguntas(texto: string): string[] {
  return (texto.match(/[^?\n]+\?/g) ?? []).map((t) => t.replace(/\s+/g, " ").trim()).filter((t) => t.length >= 8);
}

const PALAVRAS_VAZIAS = new Set(["para", "como", "qual", "quais", "voce", "você", "isso", "esse", "essa", "esta", "este", "que", "com", "uma", "mais", "mas", "quando", "onde", "porque", "seu", "sua"]);

function palavrasDe(texto: string): Set<string> {
  return new Set(
    texto
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 3 && !PALAVRAS_VAZIAS.has(w))
  );
}

/** Rede de segurança: a pergunta é quase a mesma de outra (2 em cada 3 palavras de conteúdo em comum)? */
export function parecidaComAlguma(pergunta: string, existentes: string[]): boolean {
  const a = palavrasDe(pergunta);
  if (!a.size) return false;
  return existentes.some((e) => {
    const b = palavrasDe(e);
    if (!b.size) return false;
    let comuns = 0;
    for (const w of a) if (b.has(w)) comuns++;
    return comuns / Math.min(a.size, b.size) >= 0.67 && comuns >= 2;
  });
}
