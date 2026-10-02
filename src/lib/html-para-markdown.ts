/**
 * HTML do editor rico → Markdown legível.
 *
 * O `stripHtml` de `rich-text.ts` não serve aqui: ele colapsa tudo numa linha
 * só, o que é certo pra tooltip e errado pra arquivo. Um resumo de livro de
 * 5.000 caracteres sem parágrafo nem lista fica ilegível — e um backup ilegível
 * não é backup.
 *
 * Sem DOM de propósito: roda igual no navegador, no servidor e no teste. Cobre
 * o subconjunto que o editor do FARO (TipTap) realmente produz; o que não for
 * reconhecido perde a tag e mantém o texto, que é a falha segura certa — perder
 * negrito é aceitável, perder a frase não é.
 */

/** Entidades que o editor emite. Decodificadas DEPOIS de tirar as tags, senão
 *  um `&lt;p&gt;` escrito por ele viraria tag de verdade no meio do caminho. */
const ENTIDADES: [RegExp, string][] = [
  [/&nbsp;/g, " "],
  [/&quot;/g, '"'],
  [/&#0?39;/g, "'"],
  [/&apos;/g, "'"],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&amp;/g, "&"], // por último: senão `&amp;lt;` viraria `<`
];

function decodificar(texto: string): string {
  let r = texto;
  for (const [de, para] of ENTIDADES) r = r.replace(de, para);
  return r;
}

export function htmlParaMarkdown(html: string | null | undefined): string {
  if (!html) return "";
  let t = html;

  // Script e style saem com conteúdo e tudo. Não deviam existir aqui, mas um
  // texto colado de fora pode trazer, e o corpo deles não é leitura.
  t = t.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Checklist antes de `li` genérico: o estado marcado/desmarcado é informação,
  // e some se virar só um item de lista.
  t = t.replace(/<li[^>]*data-checked="true"[^>]*>/gi, "\n- [x] ");
  t = t.replace(/<li[^>]*data-checked="false"[^>]*>/gi, "\n- [ ] ");

  // Título: o nível vem do próprio h.
  t = t.replace(/<h1[^>]*>/gi, "\n\n# ").replace(/<h2[^>]*>/gi, "\n\n## ").replace(/<h3[^>]*>/gi, "\n\n### ");
  t = t.replace(/<h[4-6][^>]*>/gi, "\n\n#### ");
  t = t.replace(/<\/h[1-6]>/gi, "\n");

  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/p>/gi, "\n\n").replace(/<p[^>]*>/gi, "");

  // Lista ordenada: todos os itens saem como "1.". É Markdown válido — quem
  // renderiza renumera — e evita ter que rastrear aninhamento pra acertar a
  // contagem, que é onde esse tipo de conversor costuma errar calado.
  t = t.replace(/<ol[^>]*>/gi, "\n").replace(/<\/ol>/gi, "\n");
  t = t.replace(/<ul[^>]*>/gi, "\n").replace(/<\/ul>/gi, "\n");
  t = t.replace(/<li[^>]*>/gi, "\n- ");
  t = t.replace(/<\/li>/gi, "");

  t = t.replace(/<blockquote[^>]*>/gi, "\n\n> ").replace(/<\/blockquote>/gi, "\n\n");

  // Link: o endereço faz parte do aprendizado (de onde veio), então vira link
  // Markdown em vez de sumir.
  t = t.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, texto) => {
    const limpo = String(texto).replace(/<[^>]*>/g, "").trim();
    return limpo ? `[${limpo}](${href})` : String(href);
  });

  t = t.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, c) => `**${String(c).replace(/<[^>]*>/g, "")}**`);
  t = t.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, c) => `*${String(c).replace(/<[^>]*>/g, "")}*`);
  t = t.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, c) => `\`${String(c).replace(/<[^>]*>/g, "")}\``);
  t = t.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // Sublinhado e marca-texto não têm Markdown. Mantém o texto e descarta a
  // marcação, em vez de inventar sintaxe que nenhum leitor entende.
  t = t.replace(/<\/?(u|mark|span|div|section|figure|figcaption)\b[^>]*>/gi, "");

  // Sobrou tag: sai, o texto fica.
  t = t.replace(/<[^>]+>/g, "");

  t = decodificar(t);

  // Arruma o espaço em branco sem colar linhas que eram separadas.
  t = t
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, "").replace(/^[ \t]+/, (e) => (l.trim().startsWith("-") ? "" : e)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Lista apertada: o editor produz `<li><p>texto</p></li>`, e o `</p>` virava
  // linha em branco ENTRE os itens. É Markdown válido, mas lido como arquivo a
  // lista fica esparramada e parece que cada item é um parágrafo solto.
  t = t.replace(/^(- .*)\n\n(?=- )/gm, "$1\n");

  return t;
}

/** Tem conteúdo de verdade? `<p></p>` do editor vazio não tem. */
export function temConteudo(html: string | null | undefined): boolean {
  return htmlParaMarkdown(html).length > 0;
}
