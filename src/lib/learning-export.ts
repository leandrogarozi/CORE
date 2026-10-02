/**
 * Transforma o aprendizado guardado no FARO em arquivos de texto legíveis.
 *
 * Por que texto e não o JSON que `/api/backup/export` já devolve: aquele é
 * cofre, serve pra restaurar o app. Este é biblioteca — ele pediu *"para sempre
 * ficar guardado para a pessoa ali ter como pegar aqueles arquivos de forma
 * fácil"*. Pegar fácil significa abrir no celular, achar pela busca do Drive e
 * ler sem o FARO existir.
 *
 * Markdown, não .txt: abre como texto puro em qualquer lugar E vira documento
 * formatado no Google Docs. Não custa nada e ganha os dois.
 *
 * Módulo puro de propósito — nada de rede, banco ou Drive aqui. É o que permite
 * testar o conteúdo dos arquivos sem credencial do Google, e é o que faz este
 * mesmo gerador servir tanto pro backup automático quanto pra uma geração
 * manual.
 */

export interface ArquivoDeAprendizado {
  nome: string;
  conteudo: string;
}

export interface LivroParaExportar {
  title: string;
  insights: string | null;
  status?: string | null;
  source?: string | null;
}

export interface SinapseParaExportar {
  title: string;
  learning: string | null;
  questions: string | null;
  source: string | null;
  createdAt?: string | null;
}

const VAZIO = (t: string | null | undefined) => !t || !t.trim();

/**
 * Título vira nome de arquivo sem quebrar o Drive nem virar ilegível.
 *
 * A barra é o caso que importa: "E/OU" num título criaria uma subpasta ou
 * simplesmente falharia. Acento fica — o Drive lida bem com UTF-8 e tirar
 * deixaria "Ação" como "Acao", que ele teria que decifrar na lista.
 */
export function nomeDeArquivo(titulo: string, extensao = "md"): string {
  const limpo = titulo
    .trim()
    .replace(/[\/\\:*?"<>|]/g, "-") // proibidos ou arriscados em nome de arquivo
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "") // ponto na frente esconde o arquivo
    .slice(0, 80)
    .trim();
  return `${limpo || "sem-titulo"}.${extensao}`;
}

/**
 * Garante nomes únicos na pasta. Dois livros com o mesmo título existem, e o
 * segundo sobrescreveria o primeiro sem avisar — perder anotação calado é
 * exatamente o que um backup não pode fazer.
 */
export function semNomesRepetidos(arquivos: ArquivoDeAprendizado[]): ArquivoDeAprendizado[] {
  const vistos = new Map<string, number>();
  return arquivos.map((a) => {
    const chave = a.nome.toLowerCase();
    const n = vistos.get(chave) ?? 0;
    vistos.set(chave, n + 1);
    if (n === 0) return a;
    const ponto = a.nome.lastIndexOf(".");
    const base = ponto > 0 ? a.nome.slice(0, ponto) : a.nome;
    const ext = ponto > 0 ? a.nome.slice(ponto) : "";
    return { ...a, nome: `${base} (${n + 1})${ext}` };
  });
}

export function arquivoDoLivro(livro: LivroParaExportar): ArquivoDeAprendizado | null {
  // Livro sem resumo escrito não vira arquivo. São a maioria da estante dele
  // (43 de 47 na primeira exportação): só o título, ainda sem anotação. Gerar
  // 43 arquivos vazios enterraria os 4 que têm conteúdo de verdade — eles
  // continuam listados no índice, que é o lugar certo pra uma lista de leitura.
  if (VAZIO(livro.insights)) return null;
  const partes = [`# ${livro.title.trim()}`, ""];
  if (livro.source?.trim()) partes.push(`**Fonte:** ${livro.source.trim()}`, "");
  partes.push("## O que ficou", "", livro.insights!.trim(), "");
  return { nome: nomeDeArquivo(livro.title), conteudo: partes.join("\n") };
}

export function arquivoDaSinapse(s: SinapseParaExportar): ArquivoDeAprendizado | null {
  // Sinapse só vale como arquivo se tem aprendizado OU pergunta. Título sozinho
  // é um lembrete de escrever, não um aprendizado guardado.
  if (VAZIO(s.learning) && VAZIO(s.questions)) return null;
  const partes = [`# ${s.title.trim()}`, ""];
  if (s.source?.trim()) partes.push(`**Fonte:** ${s.source.trim()}`, "");
  if (s.createdAt) partes.push(`**Anotado em:** ${s.createdAt.slice(0, 10)}`, "");
  if (!VAZIO(s.learning)) partes.push("## Aprendizado", "", s.learning!.trim(), "");
  if (!VAZIO(s.questions)) partes.push("## Perguntas em aberto", "", s.questions!.trim(), "");
  return { nome: nomeDeArquivo(s.title), conteudo: partes.join("\n") };
}

/**
 * O índice. Cumpre duas funções: dá o mapa da pasta e é o único lugar onde a
 * estante inteira aparece, inclusive os livros ainda sem anotação — a lista de
 * leitura é informação, e sumir com ela faria o backup contar menos do que o
 * app sabe.
 */
export function indiceDoAprendizado(
  livros: LivroParaExportar[],
  sinapses: SinapseParaExportar[],
  geradoEm: string
): ArquivoDeAprendizado {
  const comResumo = livros.filter((l) => !VAZIO(l.insights));
  const semResumo = livros.filter((l) => VAZIO(l.insights));
  const sinapsesComTexto = sinapses.filter((s) => !VAZIO(s.learning) || !VAZIO(s.questions));

  const linhas = [
    "# Aprendizado — FARO",
    "",
    `Backup gerado em ${geradoEm.slice(0, 10)}.`,
    "",
    `${sinapsesComTexto.length} sinapse(s) e ${comResumo.length} livro(s) com anotação, um arquivo cada.`,
    "",
  ];

  if (sinapsesComTexto.length) {
    linhas.push("## Sinapses", "");
    for (const s of sinapsesComTexto) linhas.push(`- ${s.title.trim()}`);
    linhas.push("");
  }
  if (comResumo.length) {
    linhas.push("## Livros com anotação", "");
    for (const l of comResumo) linhas.push(`- ${l.title.trim()}`);
    linhas.push("");
  }
  if (semResumo.length) {
    linhas.push(
      "## Estante — ainda sem anotação",
      "",
      "Estes não têm arquivo próprio porque ainda não têm nada escrito.",
      ""
    );
    for (const l of semResumo) {
      linhas.push(`- ${l.title.trim()}${l.status?.trim() ? ` — ${l.status.trim()}` : ""}`);
    }
    linhas.push("");
  }

  return { nome: "00 — Índice.md", conteudo: linhas.join("\n") };
}

/** A pasta inteira, pronta pra subir. */
export function pastaDeAprendizado(
  livros: LivroParaExportar[],
  sinapses: SinapseParaExportar[],
  geradoEm: string
): ArquivoDeAprendizado[] {
  const arquivos = [
    indiceDoAprendizado(livros, sinapses, geradoEm),
    ...sinapses.map(arquivoDaSinapse).filter((a): a is ArquivoDeAprendizado => a !== null),
    ...livros.map(arquivoDoLivro).filter((a): a is ArquivoDeAprendizado => a !== null),
  ];
  return semNomesRepetidos(arquivos);
}
