/**
 * "Conhecendo você": o que a pessoa traz da IA dela para dentro do FARO.
 *
 * O FARO não consegue ler a memória da IA de ninguém (nem Claude nem ChatGPT
 * liberam isso). Quem traz é a própria IA, quando a pessoa pede: o FARO entrega
 * o texto do pedido, a IA responde num formato combinado e a pessoa cola a
 * resposta de volta. Este módulo guarda o pedido e lê a resposta.
 *
 * Módulo puro: sem rede, sem banco. É o que deixa testar o leitor em Node.
 */

export const TIPOS_DE_CONHECIMENTO = [
  { id: "perfil", rotulo: "Perfil" },
  { id: "valor", rotulo: "Valor ou crença" },
  { id: "objetivo", rotulo: "Objetivo" },
  { id: "aprendizado", rotulo: "Aprendizado" },
  { id: "ideia", rotulo: "Ideia" },
  { id: "estudo", rotulo: "Estudo" },
  { id: "livro", rotulo: "Livro" },
  { id: "projeto", rotulo: "Projeto" },
  { id: "conteudo", rotulo: "Conteúdo produzido" },
  { id: "preferencia", rotulo: "Preferência" },
  { id: "decisao", rotulo: "Decisão" },
  { id: "outro", rotulo: "Outro" },
] as const;

export type TipoDeConhecimento = (typeof TIPOS_DE_CONHECIMENTO)[number]["id"];

export function rotuloDoTipo(tipo: string): string {
  return TIPOS_DE_CONHECIMENTO.find((t) => t.id === tipo)?.rotulo ?? "Outro";
}

/** O pedido que a pessoa cola na IA dela. */
export const TEXTO_DE_IMPORTACAO = `Quero levar para o FARO, o app onde guardo meus aprendizados e a minha rotina, TUDO o que você sabe sobre mim e TUDO o que já produzimos juntos. Não resuma demais: aqui completude vale mais que brevidade. Se for muita coisa, pode passar de centenas de páginas, e tudo bem. Divida a resposta em partes ("PARTE 1 de N") e continue quando eu disser "continue".

O que trazer:
1. SOBRE MIM: quem sou, minha história, valores, crenças, objetivos, rotina, preferências, meu jeito de escrever, de decidir e de trabalhar, pessoas e projetos importantes para mim.
2. O QUE JÁ PRODUZIMOS JUNTOS: textos, roteiros, posts, estudos, resumos de livros e cursos, planos, projetos, métodos e frameworks, decisões (e o porquê de cada uma), ideias, perguntas e aprendizados. Traga o CONTEÚDO COMPLETO de cada material, não só o título.
3. Se você tiver acesso a conversas anteriores, projetos ou memória, PROCURE LÁ antes de responder.

Regras:
- Não invente nada. Se não tiver certeza, escreva "(incerto)".
- Use as minhas palavras quando possível.
- Coloque a data de cada item (ou "data aproximada" / "desconhecida").
- Não inclua senhas, dados bancários, nem dados de saúde e medicamentos.

Formato OBRIGATÓRIO de cada item (repita o bloco para cada um):

=== ITEM ===
tipo: perfil | valor | objetivo | aprendizado | ideia | estudo | livro | projeto | conteudo | preferencia | decisao
título: (um título curto)
data: (AAAA-MM-DD, aproximada ou desconhecida)
origem: (a conversa ou o projeto de onde veio)
tags: (palavras separadas por vírgula)
conteúdo:
(o texto completo, em Markdown, quantas linhas forem necessárias)
=== FIM ===`;

export interface ItemImportado {
  tipo: TipoDeConhecimento;
  titulo: string;
  conteudo: string;
  data: string | null;
  origem: string | null;
  tags: string[];
}

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizarTipo(raw: string): TipoDeConhecimento {
  const t = semAcento(raw.toLowerCase()).replace(/[^a-z]/g, "");
  const mapa: Record<string, TipoDeConhecimento> = {
    perfil: "perfil",
    sobremim: "perfil",
    valor: "valor",
    valores: "valor",
    crenca: "valor",
    crencas: "valor",
    objetivo: "objetivo",
    objetivos: "objetivo",
    meta: "objetivo",
    aprendizado: "aprendizado",
    aprendizados: "aprendizado",
    ideia: "ideia",
    ideias: "ideia",
    estudo: "estudo",
    estudos: "estudo",
    livro: "livro",
    livros: "livro",
    projeto: "projeto",
    projetos: "projeto",
    conteudo: "conteudo",
    conteudos: "conteudo",
    preferencia: "preferencia",
    preferencias: "preferencia",
    decisao: "decisao",
    decisoes: "decisao",
  };
  return mapa[t] ?? "outro";
}

const CAMPO = /^\s*[*_>-]*\s*(tipo|t[ií]tulo|data|origem|tags|conte[uú]do)\s*[*_]*\s*:\s*[*_]*\s*(.*)$/i;

function chaveDoCampo(nome: string): "tipo" | "titulo" | "data" | "origem" | "tags" | "conteudo" {
  const n = semAcento(nome.toLowerCase());
  if (n.startsWith("tit")) return "titulo";
  if (n.startsWith("cont")) return "conteudo";
  return n as "tipo" | "data" | "origem" | "tags";
}

function limpar(v: string): string {
  return v.replace(/^[*_\s]+|[*_\s]+$/g, "").trim();
}

/**
 * Lê a resposta da IA. Aceita os blocos "=== ITEM === ... === FIM ===" mesmo com
 * negrito, marcadores e cercas de código no meio (cada IA enfeita do seu jeito).
 * Sem nenhum bloco, o texto inteiro vira um item só, para nada se perder.
 */
export function lerImportacao(texto: string): ItemImportado[] {
  const semCercas = texto.replace(/^```[a-z]*\s*$/gim, "");
  const partes = semCercas.split(/^\s*[*_]*\s*=+\s*ITEM\s*=+\s*[*_]*\s*$/gim);
  if (partes.length <= 1) {
    const corpo = semCercas.trim();
    if (!corpo) return [];
    const primeira = corpo.split("\n").find((l) => l.trim()) ?? "Importado da IA";
    return [
      {
        tipo: "outro",
        titulo: limpar(primeira.replace(/^#+\s*/, "")).slice(0, 120) || "Importado da IA",
        conteudo: corpo,
        data: null,
        origem: null,
        tags: [],
      },
    ];
  }

  const itens: ItemImportado[] = [];
  for (const bloco of partes.slice(1)) {
    const ate = bloco.split(/^\s*[*_]*\s*=+\s*FIM\s*=+\s*[*_]*\s*$/im)[0];
    const linhas = ate.split("\n");
    const campos: Partial<Record<"tipo" | "titulo" | "data" | "origem" | "tags", string>> = {};
    const conteudo: string[] = [];
    let noConteudo = false;
    for (const linha of linhas) {
      if (!noConteudo) {
        const m = linha.match(CAMPO);
        if (m) {
          const chave = chaveDoCampo(m[1]);
          if (chave === "conteudo") {
            noConteudo = true;
            if (limpar(m[2])) conteudo.push(m[2]);
          } else {
            campos[chave] = limpar(m[2]);
          }
        }
        continue;
      }
      conteudo.push(linha);
    }
    const corpo = conteudo.join("\n").trim();
    const titulo = campos.titulo || corpo.split("\n")[0]?.slice(0, 120) || "";
    if (!titulo && !corpo) continue;
    const data = campos.data && !/desconhecid/i.test(campos.data) ? campos.data : null;
    itens.push({
      tipo: normalizarTipo(campos.tipo ?? ""),
      titulo: titulo || "Sem título",
      conteudo: corpo,
      data,
      origem: campos.origem || null,
      tags: (campos.tags ?? "")
        .split(/[,;]/)
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean),
    });
  }
  return itens;
}

/** Chave para não importar duas vezes a mesma coisa (colar a mesma parte de novo). */
export function chaveDoItem(i: { tipo: string; titulo: string }): string {
  return `${i.tipo}|${semAcento(i.titulo.toLowerCase()).replace(/\s+/g, " ").trim()}`;
}

/** O item aprovado no formato do arquivo (pasta "Conhecendo você"). */
export function conhecimentoParaExportar(k: {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  dataRef: string | null;
  origem: string | null;
  tags: string[];
  fonte: string;
}) {
  return {
    id: k.id,
    tipo: k.tipo,
    rotuloDoTipo: rotuloDoTipo(k.tipo),
    titulo: k.titulo,
    conteudo: k.conteudo,
    dataRef: k.dataRef,
    origem: k.origem,
    tags: k.tags,
    fonte: k.fonte,
  };
}
