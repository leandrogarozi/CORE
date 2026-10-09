import { htmlParaMarkdown, temConteudo } from "@/lib/html-para-markdown";
import {
  arquivoDaIdeia,
  arquivoDaSinapse,
  arquivoDoConhecimento,
  arquivoDoLivro,
} from "@/lib/learning-export";
import { conhecimentoParaExportar, rotuloDoTipo, TIPOS_DE_CONHECIMENTO } from "@/lib/conhecimento";
import type { KnowledgeItem, Synapse } from "@/lib/types";

/**
 * Conector FARO: um servidor MCP (Model Context Protocol) que deixa a IA do
 * Leandro (Claude, ChatGPT...) LER o cérebro do FARO: o que ele aprovou em
 * "Conhecendo você", as sinapses, as ideias e o que anotou dos livros.
 *
 * Só leitura, nesta etapa. Nada aqui escreve no banco. Saúde e medicamentos
 * ficam de fora de propósito: este módulo nem recebe essas tabelas.
 *
 * Módulo puro (sem rede e sem banco): a rota carrega o acervo e entrega aqui.
 * É o que deixa testar o protocolo inteiro com dados de mentira.
 */

export const VERSAO_DO_PROTOCOLO = "2025-06-18";
const VERSOES_ACEITAS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

export const PASTA_DO_APRENDIZADO_NO_DRIVE =
  "LEANDRO GAROZI/Claude - IA/Apps Leandro Garozi/App faro/Aprendizado (cópia automática)";
export const ID_DA_PASTA_DO_APRENDIZADO = "168OAoMfP0aB_urOvWEMO8N2ZVYbAJBj3";

export interface LivroDoAcervo {
  id: string;
  title: string;
  status: string;
  insights: string | null;
  createdAt: string;
}

export interface AcervoDoFaro {
  nome: string; // nome da pessoa (para a IA saber de quem é o acervo)
  resumo?: string; // "O que o FARO sabe sobre mim": texto corrido escrito pela IA e guardado
  sinapses: Synapse[]; // sinapses e ideias (kind)
  livros: LivroDoAcervo[];
  conhecimento: KnowledgeItem[]; // só os aprovados
}

// Tipos que contam "quem a pessoa é": vão inteiros no faro_sobre_mim.
const TIPOS_DO_PERFIL = ["perfil", "valor", "objetivo", "preferencia", "decisao"];
const LIMITE_DE_TEXTO = 60000;

const INSTRUCOES = `Este é o FARO, o app pessoal do Leandro Garozi (produtividade, rotina e aprendizados). Por aqui você LÊ o cérebro dele: o que ele aprovou sobre si mesmo em "Conhecendo você" (perfil, valores, objetivos, preferências, decisões, estudos, projetos, conteúdos), as Sinapses (aprendizados que mudaram uma crença, cada um com a pergunta que reconecta com ele), as Ideias (insights rápidos) e o que ele anotou dos livros.

Como usar:
- No começo de uma conversa em que contexto pessoal ajuda, chame faro_sobre_mim.
- Para qualquer assunto, chame faro_buscar antes de responder de memória; depois faro_ler para o texto inteiro.
- faro_novidades mostra o que entrou desde uma data. faro_listar lista por tipo.
- faro_onde_estao_os_arquivos diz em que pasta do Google Drive estão as cópias em Markdown (uma por item, compatíveis com Obsidian), caso você tenha acesso ao Drive.

O que está aqui é a palavra dele: prefira isso ao que você supõe. Responda em português do Brasil. Este conector só lê; para guardar algo novo, sugira que ele cole no FARO (Conhecendo você).`;

// ---------------------------------------------------------------------------
// Ferramentas

const TIPOS_LISTAVEIS = ["sinapse", "ideia", "livro", "conhecimento", ...TIPOS_DE_CONHECIMENTO.map((t) => t.id)];

export const FERRAMENTAS = [
  {
    name: "faro_sobre_mim",
    title: "Quem é o Leandro",
    description:
      "Perfil do Leandro aprovado por ele no FARO: perfil, valores, objetivos, preferências e decisões (texto inteiro), mais um resumo do resto do acervo. Use no começo de conversas em que contexto pessoal ajuda.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "faro_buscar",
    title: "Buscar no FARO",
    description:
      "Busca por palavras em todo o acervo: Conhecendo você, Sinapses, Ideias e anotações de livros. Ignora acentos e maiúsculas. Devolve título, tipo, id e um trecho; use faro_ler com o id para o texto inteiro.",
    inputSchema: {
      type: "object",
      properties: {
        consulta: { type: "string", description: "Palavras a buscar, ex.: 'liderança equipe'." },
        tipo: {
          type: "string",
          enum: TIPOS_LISTAVEIS,
          description: "Opcional: restringe a um tipo (sinapse, ideia, livro, conhecimento ou um tipo de Conhecendo você).",
        },
        limite: { type: "integer", minimum: 1, maximum: 50, description: "Máximo de resultados (padrão 15)." },
      },
      required: ["consulta"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "faro_ler",
    title: "Ler um item",
    description: "Texto inteiro de um item do FARO (em Markdown), pelo id que veio de faro_buscar, faro_listar ou faro_novidades.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "O id do item." } },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "faro_listar",
    title: "Listar por tipo",
    description:
      "Lista os itens de um tipo, do mais novo para o mais antigo: sinapse, ideia, livro, conhecimento (tudo de Conhecendo você) ou um tipo específico de Conhecendo você (perfil, valor, objetivo, aprendizado, estudo, projeto, conteudo...).",
    inputSchema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: TIPOS_LISTAVEIS },
        limite: { type: "integer", minimum: 1, maximum: 200, description: "Máximo de itens (padrão 50)." },
      },
      required: ["tipo"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "faro_novidades",
    title: "O que entrou de novo",
    description: "Itens que entraram no FARO desde uma data (padrão: últimos 7 dias). Bom para saber o que ele andou aprendendo.",
    inputSchema: {
      type: "object",
      properties: { desde: { type: "string", description: "Data no formato AAAA-MM-DD." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "faro_onde_estao_os_arquivos",
    title: "Onde estão os arquivos",
    description:
      "Onde ficam, no Google Drive, as cópias em Markdown de tudo isso (um arquivo por item, com cabeçalho do Obsidian), e como a pasta é organizada.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
] as const;

// ---------------------------------------------------------------------------
// O acervo como uma lista só de itens, cada um com tipo, título e texto.

interface Item {
  id: string;
  tipo: string; // sinapse | ideia | livro | <tipo de conhecimento>
  rotulo: string;
  titulo: string;
  texto: string; // Markdown, para busca e trecho
  data: string; // ISO
  completo: () => string;
}

function itensDoAcervo(a: AcervoDoFaro): Item[] {
  const itens: Item[] = [];
  for (const s of a.sinapses) {
    if (s.kind === "ideia") {
      const arq = arquivoDaIdeia(s);
      if (!arq) continue;
      itens.push({
        id: s.id,
        tipo: "ideia",
        rotulo: "Ideia",
        titulo: s.title.trim() || "Ideia",
        texto: htmlParaMarkdown(s.learning),
        data: s.createdAt,
        completo: () => arq.conteudo,
      });
    } else {
      const arq = arquivoDaSinapse(s);
      if (!arq) continue;
      itens.push({
        id: s.id,
        tipo: "sinapse",
        rotulo: "Sinapse",
        titulo: s.title.trim() || "Sinapse",
        texto: [s.source ?? "", htmlParaMarkdown(s.learning), htmlParaMarkdown(s.questions)].join("\n"),
        data: s.createdAt,
        completo: () => arq.conteudo,
      });
    }
  }
  for (const l of a.livros) {
    // Mesma regra do backup: livro sem anotação não é aprendizado guardado.
    if (!temConteudo(l.insights)) continue;
    const arq = arquivoDoLivro(l);
    if (!arq) continue;
    itens.push({
      id: l.id,
      tipo: "livro",
      rotulo: "Livro",
      titulo: l.title.trim(),
      texto: htmlParaMarkdown(l.insights),
      data: l.createdAt,
      completo: () => arq.conteudo,
    });
  }
  for (const k of a.conhecimento) {
    if (k.status !== "aprovado") continue;
    itens.push({
      id: k.id,
      tipo: k.tipo,
      rotulo: rotuloDoTipo(k.tipo),
      titulo: k.titulo.trim(),
      texto: [k.tags.join(" "), k.conteudo].join("\n"),
      data: k.createdAt,
      completo: () => arquivoDoConhecimento(conhecimentoParaExportar(k)).conteudo,
    });
  }
  return itens.sort((x, y) => y.data.localeCompare(x.data));
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function filtraTipo(itens: Item[], tipo: string | undefined): Item[] {
  if (!tipo) return itens;
  if (tipo === "conhecimento") return itens.filter((i) => !["sinapse", "ideia", "livro"].includes(i.tipo));
  return itens.filter((i) => i.tipo === tipo);
}

function linhaDoItem(i: Item): string {
  return `- [${i.rotulo}] ${i.titulo} (id: ${i.id}, ${i.data.slice(0, 10)})`;
}

function trecho(texto: string, termos: string[]): string {
  const plano = texto.replace(/\s+/g, " ").trim();
  const norm = semAcento(plano);
  let pos = -1;
  for (const t of termos) {
    pos = norm.indexOf(t);
    if (pos >= 0) break;
  }
  const ini = Math.max(0, pos - 80);
  const fim = Math.min(plano.length, (pos < 0 ? 0 : pos) + 220);
  return (ini > 0 ? "…" : "") + plano.slice(ini, fim) + (fim < plano.length ? "…" : "");
}

function buscar(itens: Item[], consulta: string, limite: number): Item[] {
  const termos = semAcento(consulta)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);
  if (!termos.length) return [];
  const pontuar = (i: Item, todos: boolean) => {
    const t = semAcento(i.titulo);
    const c = semAcento(i.texto);
    let pontos = 0;
    let achou = 0;
    for (const termo of termos) {
      const noTitulo = t.includes(termo);
      const noTexto = c.includes(termo);
      if (noTitulo || noTexto) achou++;
      pontos += (noTitulo ? 5 : 0) + (noTexto ? 1 + Math.min(4, c.split(termo).length - 2) : 0);
    }
    if (todos ? achou < termos.length : achou === 0) return 0;
    return pontos + achou * 3;
  };
  // Primeiro exige todas as palavras; se nada aparecer, aceita qualquer uma.
  for (const todos of [true, false]) {
    const achados = itens
      .map((i) => ({ i, p: pontuar(i, todos) }))
      .filter((x) => x.p > 0)
      .sort((x, y) => y.p - x.p || y.i.data.localeCompare(x.i.data))
      .slice(0, limite)
      .map((x) => x.i);
    if (achados.length) return achados;
  }
  return [];
}

function cortar(texto: string): string {
  if (texto.length <= LIMITE_DE_TEXTO) return texto;
  return texto.slice(0, LIMITE_DE_TEXTO) + "\n\n[…texto cortado por tamanho; use faro_listar e faro_ler para o resto]";
}

function sobreMim(a: AcervoDoFaro, itens: Item[]): string {
  const partes = [`# Sobre ${a.nome || "o Leandro"} (aprovado por ele no FARO)`, ""];
  if (a.resumo) partes.push("## Resumo geral (escrito pela IA a partir do que ele aprovou)", "", a.resumo, "");
  const doPerfil = itens.filter((i) => TIPOS_DO_PERFIL.includes(i.tipo));
  if (!doPerfil.length) {
    partes.push(
      "Ainda não há perfil aprovado em \"Conhecendo você\". Sugira que ele importe o que a IA já sabe (FARO → Conhecendo você → Trazer o que minha IA já sabe).",
      ""
    );
  }
  for (const tipo of TIPOS_DO_PERFIL) {
    const doTipo = doPerfil.filter((i) => i.tipo === tipo);
    if (!doTipo.length) continue;
    partes.push(`## ${rotuloDoTipo(tipo)}`, "");
    for (const i of doTipo) {
      const k = a.conhecimento.find((x) => x.id === i.id)!;
      partes.push(`### ${i.titulo}${k.dataRef ? ` (${k.dataRef})` : ""}`, "", k.conteudo.trim(), "");
    }
  }
  const resto = itens.filter((i) => !TIPOS_DO_PERFIL.includes(i.tipo));
  const contagem = new Map<string, number>();
  for (const i of resto) contagem.set(i.rotulo, (contagem.get(i.rotulo) ?? 0) + 1);
  if (resto.length) {
    partes.push("## O resto do acervo", "");
    for (const [rotulo, n] of [...contagem].sort((x, y) => y[1] - x[1])) partes.push(`- ${rotulo}: ${n}`);
    partes.push("", "Os 15 mais recentes:", ...resto.slice(0, 15).map(linhaDoItem), "");
    partes.push("Use faro_buscar para achar por assunto e faro_ler para o texto inteiro.");
  }
  return cortar(partes.join("\n"));
}

function ondeEstao(): string {
  return [
    "# Onde ficam os arquivos do FARO",
    "",
    `Pasta no Google Drive do Leandro: "${PASTA_DO_APRENDIZADO_NO_DRIVE}"`,
    `ID da pasta no Drive: ${ID_DA_PASTA_DO_APRENDIZADO}`,
    "",
    "O computador dele regrava essa pasta todo dia com o que está no FARO. Um arquivo Markdown por item, com cabeçalho YAML (tipo, data, tags, id, origem: FARO), que abre no Obsidian, no Google Docs ou em qualquer editor:",
    "",
    "- 00 — Índice.md (o mapa de tudo, com a data em que foi gerado)",
    "- Sinapses/",
    "- Livros/ (só livros com anotação)",
    "- Ideias/",
    "- Conhecendo você/ (só o que ele aprovou)",
    "",
    "O id no cabeçalho de cada arquivo é o mesmo que faro_ler aceita. Se você tiver acesso ao Drive, pode ler por lá; se não, este conector entrega o mesmo conteúdo.",
    "",
    "Os backups completos do app (para restaurar, não para ler) ficam em \"LEANDRO GAROZI/Claude - IA/Apps Leandro Garozi/App faro/Backups\".",
  ].join("\n");
}

export function executarFerramenta(
  nome: string,
  args: Record<string, unknown>,
  acervo: AcervoDoFaro,
  agora: Date
): { texto: string; erro?: boolean } {
  const itens = itensDoAcervo(acervo);
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown, padrao: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(1, Math.min(max, Math.round(v))) : padrao;

  switch (nome) {
    case "faro_sobre_mim":
      return { texto: sobreMim(acervo, itens) };

    case "faro_buscar": {
      const consulta = str(args.consulta);
      if (!consulta) return { texto: "Diga o que buscar em 'consulta'.", erro: true };
      const achados = buscar(filtraTipo(itens, str(args.tipo) || undefined), consulta, num(args.limite, 15, 50));
      if (!achados.length) return { texto: `Nada encontrado no FARO para "${consulta}".` };
      const termos = semAcento(consulta).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2);
      return {
        texto: [
          `${achados.length} resultado(s) para "${consulta}":`,
          "",
          ...achados.map((i) => `${linhaDoItem(i)}\n  ${trecho(i.texto, termos)}`),
        ].join("\n"),
      };
    }

    case "faro_ler": {
      const id = str(args.id);
      const item = itens.find((i) => i.id === id);
      if (!item) return { texto: `Não achei item com id ${id || "(vazio)"}.`, erro: true };
      return { texto: cortar(item.completo()) };
    }

    case "faro_listar": {
      const tipo = str(args.tipo);
      if (!TIPOS_LISTAVEIS.includes(tipo)) return { texto: `Tipo inválido. Use um destes: ${TIPOS_LISTAVEIS.join(", ")}.`, erro: true };
      const doTipo = filtraTipo(itens, tipo);
      const limite = num(args.limite, 50, 200);
      if (!doTipo.length) return { texto: `Nenhum item do tipo ${tipo}.` };
      return {
        texto: [
          `${doTipo.length} item(ns) do tipo ${tipo}${doTipo.length > limite ? ` (mostrando ${limite})` : ""}:`,
          "",
          ...doTipo.slice(0, limite).map(linhaDoItem),
        ].join("\n"),
      };
    }

    case "faro_novidades": {
      const padrao = new Date(agora.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      const desde = /^\d{4}-\d{2}-\d{2}$/.test(str(args.desde)) ? str(args.desde) : padrao;
      const novos = itens.filter((i) => i.data.slice(0, 10) >= desde);
      if (!novos.length) return { texto: `Nada novo no FARO desde ${desde}.` };
      return { texto: [`${novos.length} item(ns) desde ${desde}:`, "", ...novos.slice(0, 200).map(linhaDoItem)].join("\n") };
    }

    case "faro_onde_estao_os_arquivos":
      return { texto: ondeEstao() };

    default:
      return { texto: `Ferramenta desconhecida: ${nome}`, erro: true };
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 (o transporte "Streamable HTTP" do MCP, só a parte de POST)

interface MensagemRpc {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const resultado = (id: MensagemRpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const falha = (id: MensagemRpc["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

/**
 * Responde uma mensagem. Notificação (sem id) devolve null: a rota responde 202
 * sem corpo. `carregar` só é chamado quando uma ferramenta roda, então
 * initialize e tools/list não tocam no banco.
 */
export async function responderMensagem(
  msg: MensagemRpc,
  carregar: () => Promise<AcervoDoFaro>,
  agora: Date,
  versao: string
): Promise<object | null> {
  const ehNotificacao = msg.id === undefined || msg.id === null;
  if (!msg || typeof msg.method !== "string") return ehNotificacao ? null : falha(msg?.id, -32600, "Requisição inválida");
  if (ehNotificacao) return null;

  switch (msg.method) {
    case "initialize": {
      const pedida = typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : "";
      return resultado(msg.id, {
        protocolVersion: VERSOES_ACEITAS.includes(pedida) ? pedida : VERSAO_DO_PROTOCOLO,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "faro", title: "FARO", version: versao },
        instructions: INSTRUCOES,
      });
    }
    case "ping":
      return resultado(msg.id, {});
    case "tools/list":
      return resultado(msg.id, { tools: FERRAMENTAS });
    case "tools/call": {
      const nome = typeof msg.params?.name === "string" ? msg.params.name : "";
      if (!FERRAMENTAS.some((f) => f.name === nome)) return falha(msg.id, -32602, `Ferramenta desconhecida: ${nome}`);
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const { texto, erro } = executarFerramenta(nome, args, await carregar(), agora);
        return resultado(msg.id, { content: [{ type: "text", text: texto }], isError: !!erro });
      } catch (e) {
        return resultado(msg.id, {
          content: [{ type: "text", text: `Erro ao ler o FARO: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        });
      }
    }
    case "resources/list":
      return resultado(msg.id, { resources: [] });
    case "prompts/list":
      return resultado(msg.id, { prompts: [] });
    default:
      return falha(msg.id, -32601, `Método não suportado: ${msg.method}`);
  }
}
