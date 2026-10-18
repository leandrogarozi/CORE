import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Restaura os cadastros (clientes e links) a partir do backup. Aceita o arquivo da
 * pasta "CRM clientes" ({ clientes, links }) OU o backup completo (faro-backup-*.json,
 * com dados.clientes_cadastro e dados.cadastro_links).
 *
 * Regras: só grava com o user_id de quem está restaurando (a linha de outro dono
 * nunca entra); grava por `id` (restaurar duas vezes não duplica); clientes antes
 * dos links (o link aponta para o cliente); link cujo cliente não veio fica sem
 * cliente em vez de falhar.
 */

type Linha = Record<string, unknown>;

const COLUNAS_CLIENTE = [
  "id", "criado_em", "atualizado_em", "produto", "produtos", "nome", "whatsapp", "email", "email_norm", "whatsapp_norm",
  "aniversario", "consentimento", "consentimento_em", "consentimento_texto", "respostas_extras", "origem", "envios",
  "birthday_id", "nao_enviar", "nao_enviar_em",
] as const;
const COLUNAS_LINK = [
  "id", "codigo", "cliente", "pessoa", "ativo", "eyebrow", "titulo", "boas_vindas", "perguntas", "limit_respostas",
  "respostas_count", "respondido_em", "cliente_id", "criado_em",
] as const;

const ehLinha = (x: unknown): x is Linha => !!x && typeof x === "object" && !Array.isArray(x);

function escolher(l: Linha, colunas: readonly string[], usuario: string): Linha {
  const o: Linha = { user_id: usuario };
  for (const c of colunas) if (c in l) o[c] = l[c];
  return o;
}

export function lerArquivoDeRestauracao(bruto: unknown): { clientes: Linha[]; links: Linha[] } | null {
  if (!ehLinha(bruto)) return null;
  const dados = ehLinha(bruto.dados) ? bruto.dados : bruto;
  const clientes = (Array.isArray(dados.clientes) ? dados.clientes : dados.clientes_cadastro) as unknown;
  const links = (Array.isArray(dados.links) ? dados.links : dados.cadastro_links) as unknown;
  if (!Array.isArray(clientes) && !Array.isArray(links)) return null;
  return {
    clientes: (Array.isArray(clientes) ? clientes : []).filter(ehLinha),
    links: (Array.isArray(links) ? links : []).filter(ehLinha),
  };
}

export async function restaurarCadastros(
  supabase: SupabaseClient<Database>,
  usuario: string,
  arquivo: { clientes: Linha[]; links: Linha[] }
): Promise<{ clientes: number; links: number }> {
  const clientes = arquivo.clientes.filter((c) => typeof c.id === "string").map((c) => escolher(c, COLUNAS_CLIENTE, usuario));
  if (clientes.length) {
    const { error } = await supabase.from("clientes_cadastro").upsert(clientes as never, { onConflict: "id" });
    if (error) throw new Error(`clientes: ${error.message}`);
  }
  const links = arquivo.links
    .filter((l) => typeof l.id === "string" && typeof l.codigo === "string")
    .map((l) => escolher(l, COLUNAS_LINK, usuario));
  // O link aponta para um cliente: se esse cliente não existe (nem veio no arquivo), solta a ligação em vez de falhar.
  const referenciados = Array.from(new Set(links.map((l) => l.cliente_id).filter((x): x is string => typeof x === "string")));
  if (referenciados.length) {
    const { data, error } = await supabase.from("clientes_cadastro").select("id").eq("user_id", usuario).in("id", referenciados);
    if (error) throw new Error(`clientes: ${error.message}`);
    const existentes = new Set((data ?? []).map((c) => c.id));
    for (const l of links) if (typeof l.cliente_id === "string" && !existentes.has(l.cliente_id)) l.cliente_id = null;
  }
  if (links.length) {
    const { error } = await supabase.from("cadastro_links").upsert(links as never, { onConflict: "id" });
    if (error) throw new Error(`links: ${error.message}`);
  }
  return { clientes: clientes.length, links: links.length };
}
