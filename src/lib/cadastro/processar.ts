import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { validarCadastro } from "./validar";
import { levarAniversarioParaOFaro } from "./sincronizar";
import { lerPerguntas, respostasDoLink, slugDoLink } from "./links";

/**
 * O miolo do cadastro público, separado da rota para poder ser testado com um
 * banco de mentira (a rota só cuida de CORS e de ler o corpo da requisição).
 */

export const LIMITE_POR_IP = 8; // por 10 minutos
export const LIMITE_GLOBAL = 300; // por hora

export interface PedidoDeCadastro {
  corpo: unknown;
  ip: string;
  supabase: SupabaseClient<Database>;
  /** Chave para embaralhar o IP antes de guardar (nunca se guarda o IP puro). */
  segredo: string;
  agora: Date;
  hojeISO: string;
  avisarPush: (usuario: string, titulo: string, texto: string) => Promise<unknown>;
}

export type RespostaDoCadastro = { status: number; corpo: Record<string, unknown> };

const resp = (status: number, corpo: Record<string, unknown>): RespostaDoCadastro => ({ status, corpo });

export async function processarCadastro(p: PedidoDeCadastro): Promise<RespostaDoCadastro> {
  const { supabase, agora, hojeISO } = p;
  const ipHash = createHmac("sha256", p.segredo).update(p.ip).digest("hex").slice(0, 32);

  // --- limite de envios (conta toda tentativa, inclusive as inválidas e as de bot) ---
  const [porIp, global] = await Promise.all([
    supabase
      .from("cadastro_tentativas")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("criado_em", new Date(agora.getTime() - 10 * 60000).toISOString()),
    supabase
      .from("cadastro_tentativas")
      .select("id", { count: "exact", head: true })
      .not("ip_hash", "like", "cfg:%") // consultas da configuração têm limite próprio
      .gte("criado_em", new Date(agora.getTime() - 60 * 60000).toISOString()),
  ]);
  if ((porIp.count ?? 0) >= LIMITE_POR_IP || (global.count ?? 0) >= LIMITE_GLOBAL) {
    return resp(429, { ok: false, erro: "Muitas tentativas. Tente de novo em alguns minutos." });
  }
  await supabase.from("cadastro_tentativas").insert({ ip_hash: ipHash });
  // Faxina: tentativas com mais de um dia não servem mais.
  await supabase.from("cadastro_tentativas").delete().lt("criado_em", new Date(agora.getTime() - 24 * 3600000).toISOString());

  // --- isca antispam: quem preenche o campo escondido é robô; finge que deu certo ---
  const bruto = p.corpo && typeof p.corpo === "object" ? (p.corpo as Record<string, unknown>) : null;
  if (bruto && typeof bruto.website === "string" && bruto.website !== "") return resp(200, { ok: true });

  const v = validarCadastro(p.corpo, hojeISO);
  if (!v.ok) return resp(400, { ok: false, campo: v.campo, erro: v.erro });
  const d = v.dados;

  // --- de quem é este cadastro: pelo link, pela chave pública da página, ou o único dono ativo ---
  let usuario: string | null = null;
  let donoDaChave: string | null = null;
  if (d.chave) {
    const { data } = await supabase.from("cadastro_dono").select("user_id").eq("chave", d.chave).eq("ativo", true).maybeSingle();
    donoDaChave = data?.user_id ?? null;
    if (!donoDaChave) return resp(400, { ok: false, erro: "Chave do cadastro inválida." });
  }

  // --- link da pessoa: precisa existir, estar ativo e ainda não ter atingido o limite de respostas ---
  let link: Database["public"]["Tables"]["cadastro_links"]["Row"] | null = null;
  let respostasDoLinkValidas: Record<string, string | number | boolean | string[]> = {};
  if (d.codigo) {
    const { data } = await supabase.from("cadastro_links").select("*").eq("codigo", d.codigo).maybeSingle();
    if (!data || !data.ativo || (donoDaChave && donoDaChave !== data.user_id)) {
      return resp(400, { ok: false, ativo: false, erro: "Este link não está disponível." });
    }
    if (data.respostas_count >= data.limit_respostas) {
      return resp(409, { ok: false, respondido: true, erro: "Já recebemos as suas respostas." });
    }
    const conferidas = respostasDoLink(lerPerguntas(data.perguntas), d.respostasExtras);
    if (!conferidas.ok) return resp(400, { ok: false, campo: conferidas.campo, erro: conferidas.erro });
    respostasDoLinkValidas = conferidas.respostas;
    link = data;
    usuario = data.user_id;
  } else if (donoDaChave) {
    usuario = donoDaChave;
  } else {
    const { data } = await supabase.from("cadastro_dono").select("user_id").eq("ativo", true).limit(2);
    if (data?.length === 1) usuario = data[0].user_id;
    if (!usuario) return resp(400, { ok: false, erro: "Cadastro não configurado." });
  }

  // Produto: o da página antiga, ou o cliente do link (ex.: "witt").
  const produto = d.produto || slugDoLink(link?.cliente ?? "") || "link";

  // Modo de teste: tudo é validado (inclusive o link), nada é gravado. É o "endereço de teste" para a LP-molde.
  if (d.teste) return resp(200, { ok: true, teste: true, normalizado: { ...d, produto, chave: undefined } });

  // Reserva a vaga do link ANTES de gravar: dois envios ao mesmo tempo não passam do limite
  // (a segunda atualização falha porque o contador mudou). Se a gravação falhar, a vaga é devolvida.
  const agoraISO = agora.toISOString();
  let reservou = false;
  if (link) {
    const { data: reservado, error: erroReserva } = await supabase
      .from("cadastro_links")
      .update({ respostas_count: link.respostas_count + 1, respondido_em: agoraISO })
      .eq("id", link.id)
      .eq("respostas_count", link.respostas_count)
      .select("id");
    if (erroReserva) {
      console.error("cadastro: não reservou o link", erroReserva.message);
      return resp(500, { ok: false, erro: "Não foi possível salvar agora. Tente de novo em instantes." });
    }
    if (!reservado?.length) return resp(409, { ok: false, respondido: true, erro: "Já recebemos as suas respostas." });
    reservou = true;
  }

  try {
    // --- cliente repetido (mesmo e-mail ou mesmo WhatsApp): atualiza em vez de duplicar ---
    // Duas buscas simples (e não um filtro "ou" montado com texto), para o que a
    // página mandou nunca virar parte da consulta.
    const porEmail = await supabase.from("clientes_cadastro").select("*").eq("user_id", usuario).eq("email_norm", d.emailNorm).limit(1);
    if (porEmail.error) throw new Error(porEmail.error.message);
    let antigo = porEmail.data?.[0] ?? null;
    if (!antigo && d.whatsapp) {
      const porZap = await supabase.from("clientes_cadastro").select("*").eq("user_id", usuario).eq("whatsapp_norm", d.whatsapp).limit(1);
      if (porZap.error) throw new Error(porZap.error.message);
      antigo = porZap.data?.[0] ?? null;
    }

    let registroId: string;
    let birthdayIdAtual: string | null = null;
    const extras = (antigo && typeof antigo.respostas_extras === "object" && antigo.respostas_extras && !Array.isArray(antigo.respostas_extras)
      ? { ...(antigo.respostas_extras as Record<string, Json>) }
      : {}) as Record<string, Json>;
    // Respostas do link ficam sob o código do link; as das páginas antigas, sob o produto.
    extras[link ? link.codigo : produto] = (link ? respostasDoLinkValidas : d.respostasExtras) as Json;

    if (antigo) {
      registroId = antigo.id;
      birthdayIdAtual = antigo.birthday_id;
      const { error } = await supabase
        .from("clientes_cadastro")
        .update({
          atualizado_em: agoraISO,
          produto,
          produtos: Array.from(new Set([...(antigo.produtos ?? []), produto])),
          // Dados pessoais já guardados NÃO são sobrescritos por um novo envio (a
          // página é pública: qualquer um poderia trocar o telefone de outra
          // pessoa só sabendo o e-mail). Um novo envio só preenche o que estava vazio.
          // `nao_enviar` também fica de fora de propósito: resposta nova NUNCA desmarca sozinha.
          nome: antigo.nome || d.nome,
          whatsapp: antigo.whatsapp ?? d.whatsapp,
          whatsapp_norm: antigo.whatsapp_norm ?? d.whatsapp,
          aniversario: antigo.aniversario ?? d.aniversario,
          // O consentimento original (e a hora dele) é preservado; só vira "sim" se não era.
          consentimento: true,
          consentimento_em: antigo.consentimento ? antigo.consentimento_em : agoraISO,
          consentimento_texto: d.textoConsentimento ?? antigo.consentimento_texto,
          respostas_extras: extras,
          origem: d.origem ?? antigo.origem,
          envios: (antigo.envios ?? 1) + 1,
        })
        .eq("id", antigo.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: novo, error } = await supabase
        .from("clientes_cadastro")
        .insert({
          user_id: usuario,
          produto,
          produtos: [produto],
          nome: d.nome,
          email: d.email,
          email_norm: d.emailNorm,
          whatsapp: d.whatsapp,
          whatsapp_norm: d.whatsapp,
          aniversario: d.aniversario,
          consentimento: true,
          consentimento_em: agoraISO,
          consentimento_texto: d.textoConsentimento,
          respostas_extras: extras,
          origem: d.origem,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      registroId = novo.id;
    }

    // --- ponte com Aniversários: se falhar, o cadastro já está salvo e a pessoa não vê erro ---
    let aniversarioNoFaro = "";
    const aniv = antigo?.aniversario ?? d.aniversario ?? null;
    if (aniv && !birthdayIdAtual) {
      try {
        const r = await levarAniversarioParaOFaro(
          supabase,
          { usuario, nome: antigo?.nome ?? d.nome, whatsapp: antigo?.whatsapp ?? d.whatsapp ?? null, aniversario: aniv, produto },
          hojeISO
        );
        if (r.birthdayId) await supabase.from("clientes_cadastro").update({ birthday_id: r.birthdayId }).eq("id", registroId);
        aniversarioNoFaro = r.criou
          ? " O aniversário entrou em Aniversários, aguardando a sua confirmação (há uma tarefa para conferir)."
          : " Já havia alguém com esse nome na lista de Aniversários, então não mexi.";
      } catch (e) {
        console.error("cadastro: ponte com Aniversários falhou", e instanceof Error ? e.message : e);
      }
    }

    // --- avisa o dono: caixa de Avisos + push ---
    const nomeNoFaro = antigo?.nome ?? d.nome;
    const titulo = antigo ? `Cadastro atualizado: ${nomeNoFaro}` : `Novo cadastro: ${nomeNoFaro}`;
    const corpoAviso = `${nomeNoFaro} ${link ? `respondeu pelo link "${link.codigo}"` : `se cadastrou pela página "${produto}"`}${d.origem ? ` (${d.origem})` : ""}.${aniversarioNoFaro}`;
    const { error: erroAviso } = await supabase
      .from("faro_avisos")
      .insert({ user_id: usuario, tipo: "cadastro", titulo, corpo: corpoAviso, destino: link ? "cadastros" : d.aniversario ? "aniversarios" : null });
    if (erroAviso) console.error("cadastro: aviso não gravado", erroAviso.message);
    await p.avisarPush(usuario, titulo, corpoAviso.slice(0, 140)).catch(() => 0);

    // O link passa a apontar para a pessoa que respondeu (a ficha em Clientes).
    if (link) await supabase.from("cadastro_links").update({ cliente_id: registroId }).eq("id", link.id);

    return resp(200, { ok: true });
  } catch (e) {
    if (reservou && link) {
      await supabase
        .from("cadastro_links")
        .update({ respostas_count: link.respostas_count, respondido_em: link.respondido_em })
        .eq("id", link.id);
    }
    console.error("cadastro: falha ao gravar", e instanceof Error ? e.message : e);
    return resp(500, { ok: false, erro: "Não foi possível salvar agora. Tente de novo em instantes." });
  }
}
