import type { Tables } from "@/lib/database.types";
import { lerPerguntas, respostaEmTexto, urlDoLink, type Pergunta } from "./links";

/**
 * Planilhas (CSV) dos cadastros, para usar a tabela fora do FARO.
 * Módulo puro. Abre direto no Excel/Google Planilhas (UTF-8 com marca BOM, aspas
 * dobradas, quebra de linha dentro da célula) e nenhuma célula vira fórmula.
 */

type Cliente = Tables<"clientes_cadastro">;
type Link = Tables<"cadastro_links">;

export function celulaCsv(v: string | number | boolean | null | undefined): string {
  let t = v === null || v === undefined ? "" : String(v);
  if (/^[=@]/.test(t)) t = `'${t}`; // "=" ou "@" no começo viram fórmula numa planilha
  return `"${t.replace(/"/g, '""')}"`;
}

export function montarCsv(cabecalho: string[], linhas: (string | number | boolean | null | undefined)[][]): string {
  const todas = [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(","));
  // BOM no começo: sem ele o Excel abre o acento errado.
  return "﻿" + todas.join("\r\n") + "\r\n";
}

const dataBR = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const objeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/**
 * As respostas de UMA pessoa, separadas por pergunta: { "Qual o seu cargo?": "Gerente" }.
 * Respostas de links usam o texto da pergunta; as das páginas antigas (por produto)
 * ficam como "produto: campo".
 */
export function respostasPorPergunta(c: Cliente, links: Link[]): Record<string, string> {
  const saida: Record<string, string> = {};
  const extras = objeto(c.respostas_extras) ?? {};
  const porCodigo = new Map(links.map((l) => [l.codigo, l]));
  for (const [chave, valor] of Object.entries(extras)) {
    const blocos = objeto(valor);
    if (!blocos) continue;
    const link = porCodigo.get(chave);
    // Resposta de um link que foi apagado: sem as perguntas não dá para ler, então não aparece
    // (os dados continuam guardados no banco e no backup). Só páginas antigas, por produto, ficam como "produto: campo".
    if (!link && !(c.produtos ?? []).includes(chave)) continue;
    if (link) {
      const perguntas = lerPerguntas(link.perguntas);
      for (const p of perguntas) if (p.id in blocos) saida[p.texto] = respostaEmTexto(blocos[p.id]);
    } else {
      for (const [campo, v] of Object.entries(blocos)) saida[`${chave}: ${campo}`] = respostaEmTexto(v);
    }
  }
  return saida;
}

/** Todas as perguntas que existem (sem repetir texto), na ordem em que aparecem. */
function colunasDePerguntas(links: Link[], porPessoa: Record<string, string>[]): string[] {
  const colunas: string[] = [];
  const vistas = new Set<string>();
  const add = (t: string) => {
    if (!vistas.has(t)) {
      vistas.add(t);
      colunas.push(t);
    }
  };
  for (const l of links) for (const p of lerPerguntas(l.perguntas)) add(p.texto);
  for (const r of porPessoa) for (const k of Object.keys(r)) add(k);
  return colunas;
}

export function csvDosClientes(clientes: Cliente[], links: Link[]): string {
  const respostas = clientes.map((c) => respostasPorPergunta(c, links));
  const perguntas = colunasDePerguntas(links, respostas);
  const codigosPorCliente = new Map<string, string[]>();
  for (const l of links) if (l.cliente_id) codigosPorCliente.set(l.cliente_id, [...(codigosPorCliente.get(l.cliente_id) ?? []), l.codigo]);
  return montarCsv(
    [
      "Nome", "E-mail", "WhatsApp", "Aniversário", "Produtos", "Links", "Origem", "Cadastrado em", "Última resposta em",
      "Envios", "Consentimento", "Consentimento em", "Não enviar", "Não enviar desde", ...perguntas,
    ],
    clientes.map((c, i) => [
      c.nome, c.email, c.whatsapp ?? "", dataBR(c.aniversario), (c.produtos ?? []).join("; "),
      (codigosPorCliente.get(c.id) ?? []).join("; "), c.origem ?? "", dataBR(c.criado_em), dataBR(c.atualizado_em),
      c.envios, c.consentimento ? "Sim" : "Não", dataBR(c.consentimento_em), c.nao_enviar ? "Sim" : "Não", dataBR(c.nao_enviar_em),
      ...perguntas.map((p) => respostas[i][p] ?? ""),
    ])
  );
}

export function statusDoLink(l: Pick<Link, "ativo" | "respostas_count" | "limit_respostas">): "desativado" | "respondido" | "pendente" {
  if (l.respostas_count >= l.limit_respostas) return "respondido";
  return l.ativo ? "pendente" : "desativado";
}
const ROTULO_STATUS = { desativado: "Desativado", respondido: "Respondido", pendente: "Aguardando resposta" } as const;
export const rotuloDoStatus = (s: ReturnType<typeof statusDoLink>) => ROTULO_STATUS[s];

export function csvDosLinks(links: Link[], clientes: Cliente[]): string {
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const resp = links.map((l) => {
    const c = l.cliente_id ? porId.get(l.cliente_id) : undefined;
    return c ? respostasPorPergunta(c, [l]) : {};
  });
  const perguntas = colunasDePerguntas(links, resp);
  return montarCsv(
    [
      "Código", "Link", "Cliente", "Pessoa", "Situação", "Ativo", "Criado em", "Respondido em", "Respostas", "Limite",
      "Nome de quem respondeu", "E-mail", "WhatsApp", "Aniversário", "Não enviar", ...perguntas,
    ],
    links.map((l, i) => {
      const c = l.cliente_id ? porId.get(l.cliente_id) : undefined;
      // Só as perguntas DESTE link: a pessoa pode ter respondido outros links.
      const meus = new Set(lerPerguntas(l.perguntas).map((p: Pergunta) => p.texto));
      return [
        l.codigo, urlDoLink(l.codigo), l.cliente, l.pessoa, rotuloDoStatus(statusDoLink(l)), l.ativo ? "Sim" : "Não",
        dataBR(l.criado_em), dataBR(l.respondido_em), l.respostas_count, l.limit_respostas,
        c?.nome ?? "", c?.email ?? "", c?.whatsapp ?? "", dataBR(c?.aniversario), c ? (c.nao_enviar ? "Sim" : "Não") : "",
        ...perguntas.map((p) => (meus.has(p) ? resp[i][p] ?? "" : "")),
      ];
    })
  );
}
