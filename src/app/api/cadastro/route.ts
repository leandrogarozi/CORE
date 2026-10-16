import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarPushAoUsuario } from "@/lib/push/enviar";
import { ORIGENS_PERMITIDAS, origemPermitida, validarCadastro } from "@/lib/cadastro/validar";
import { levarAniversarioParaOFaro } from "@/lib/cadastro/sincronizar";
import type { Json } from "@/lib/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Endpoint PÚBLICO de cadastro de clientes (as LPs em cadastro.leandrogarozi.com.br).
 *
 *   POST /api/cadastro   JSON: produto, nome, email, consentimento (obrigatórios);
 *                        whatsapp, aniversario (AAAA-MM-DD), respostas_extras,
 *                        origem, texto_consentimento, chave, teste, website (isca).
 *
 * Resposta: 200 {ok:true} | 400 {ok:false, campo, erro} | 403 | 429 {ok:false, erro}
 *
 * Segurança: a chave de serviço nunca sai do servidor; CORS só para as páginas do
 * subdomínio; limite por IP e global; campo-isca `website` (bot que preenche é
 * ignorado em silêncio); a tabela tem RLS sem leitura pública. A resposta não
 * conta se a pessoa já era cadastrada (não vaza quem está na lista).
 */

const LIMITE_POR_IP = 8; // por 10 minutos
const LIMITE_GLOBAL = 300; // por hora
const TAMANHO_MAXIMO = 16 * 1024;

function cabecalhos(origem: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origem && ORIGENS_PERMITIDAS.includes(origem)) h["Access-Control-Allow-Origin"] = origem;
  return h;
}

function responder(corpo: object, status: number, origem: string | null) {
  return NextResponse.json(corpo, { status, headers: cabecalhos(origem) });
}

const hojeNoBrasil = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export async function OPTIONS(req: NextRequest) {
  const origem = req.headers.get("origin");
  if (!origemPermitida(origem)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: cabecalhos(origem) });
}

export async function POST(req: NextRequest) {
  const origem = req.headers.get("origin");
  if (!origemPermitida(origem)) return responder({ ok: false, erro: "Origem não permitida." }, 403, null);

  const bruto = await req.text();
  if (bruto.length > TAMANHO_MAXIMO) return responder({ ok: false, erro: "Corpo grande demais." }, 400, origem);
  let corpo: unknown;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return responder({ ok: false, erro: "JSON inválido." }, 400, origem);
  }

  const supabase = createServiceClient();

  // --- limite de envios (conta toda tentativa, inclusive as inválidas e as de bot) ---
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
  const chaveDoHash = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "faro";
  const ipHash = createHmac("sha256", chaveDoHash).update(ip).digest("hex").slice(0, 32);
  const agora = Date.now();
  const [porIp, global] = await Promise.all([
    supabase
      .from("cadastro_tentativas")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("criado_em", new Date(agora - 10 * 60000).toISOString()),
    supabase
      .from("cadastro_tentativas")
      .select("id", { count: "exact", head: true })
      .gte("criado_em", new Date(agora - 60 * 60000).toISOString()),
  ]);
  if ((porIp.count ?? 0) >= LIMITE_POR_IP || (global.count ?? 0) >= LIMITE_GLOBAL) {
    return responder({ ok: false, erro: "Muitas tentativas. Tente de novo em alguns minutos." }, 429, origem);
  }
  await supabase.from("cadastro_tentativas").insert({ ip_hash: ipHash });
  // Faxina: tentativas com mais de um dia não servem mais.
  await supabase.from("cadastro_tentativas").delete().lt("criado_em", new Date(agora - 24 * 3600000).toISOString());

  // --- isca antispam: quem preenche o campo escondido é robô; finge que deu certo ---
  if (corpo && typeof corpo === "object" && typeof (corpo as Record<string, unknown>).website === "string" && (corpo as Record<string, unknown>).website !== "") {
    return responder({ ok: true }, 200, origem);
  }

  const hoje = hojeNoBrasil();
  const v = validarCadastro(corpo, hoje);
  if (!v.ok) return responder({ ok: false, campo: v.campo, erro: v.erro }, 400, origem);
  const d = v.dados;

  // --- de quem é este cadastro: pela chave pública da página, ou o único dono ativo ---
  let usuario: string | null = null;
  if (d.chave) {
    const { data } = await supabase.from("cadastro_dono").select("user_id").eq("chave", d.chave).eq("ativo", true).maybeSingle();
    usuario = data?.user_id ?? null;
    if (!usuario) return responder({ ok: false, erro: "Chave do cadastro inválida." }, 400, origem);
  } else {
    const { data } = await supabase.from("cadastro_dono").select("user_id").eq("ativo", true).limit(2);
    if (data?.length === 1) usuario = data[0].user_id;
    if (!usuario) return responder({ ok: false, erro: "Cadastro não configurado." }, 400, origem);
  }

  // Modo de teste: tudo é validado, nada é gravado. É o "endereço de teste" para a LP-molde.
  if (d.teste) {
    return responder({ ok: true, teste: true, normalizado: { ...d, chave: undefined } }, 200, origem);
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

    const agoraISO = new Date().toISOString();
    let registroId: string;
    let birthdayIdAtual: string | null = null;
    const extras = (antigo && typeof antigo.respostas_extras === "object" && antigo.respostas_extras && !Array.isArray(antigo.respostas_extras)
      ? { ...(antigo.respostas_extras as Record<string, Json>) }
      : {}) as Record<string, Json>;
    extras[d.produto] = d.respostasExtras as Json;

    if (antigo) {
      registroId = antigo.id;
      birthdayIdAtual = antigo.birthday_id;
      const { error } = await supabase
        .from("clientes_cadastro")
        .update({
          atualizado_em: agoraISO,
          produto: d.produto,
          produtos: Array.from(new Set([...(antigo.produtos ?? []), d.produto])),
          // Dados pessoais já guardados NÃO são sobrescritos por um novo envio (a
          // página é pública: qualquer um poderia trocar o telefone de outra
          // pessoa só sabendo o e-mail). Um novo envio só preenche o que estava vazio.
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
          produto: d.produto,
          produtos: [d.produto],
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
          { usuario, nome: antigo?.nome ?? d.nome, whatsapp: antigo?.whatsapp ?? d.whatsapp ?? null, aniversario: aniv, produto: d.produto },
          hoje
        );
        if (r.birthdayId) await supabase.from("clientes_cadastro").update({ birthday_id: r.birthdayId }).eq("id", registroId);
        aniversarioNoFaro = r.criou
          ? " O aniversário entrou na lista de Aniversários, com lembrete às 9h."
          : " Já havia alguém com esse nome na lista de Aniversários, então não mexi.";
      } catch (e) {
        console.error("cadastro: ponte com Aniversários falhou", e instanceof Error ? e.message : e);
      }
    }

    // --- avisa o dono: caixa de Avisos + push ---
    const titulo = antigo ? `Cadastro atualizado: ${d.nome}` : `Novo cadastro: ${d.nome}`;
    const corpoAviso = `${d.nome} se cadastrou pela página "${d.produto}"${d.origem ? ` (${d.origem})` : ""}.${aniversarioNoFaro}`;
    const { error: erroAviso } = await supabase
      .from("faro_avisos")
      .insert({ user_id: usuario, tipo: "cadastro", titulo, corpo: corpoAviso, destino: d.aniversario ? "aniversarios" : null });
    if (erroAviso) console.error("cadastro: aviso não gravado", erroAviso.message);
    await enviarPushAoUsuario(supabase, usuario, { title: titulo, body: corpoAviso.slice(0, 140) }).catch(() => 0);

    return responder({ ok: true }, 200, origem);
  } catch (e) {
    console.error("cadastro: falha ao gravar", e instanceof Error ? e.message : e);
    return responder({ ok: false, erro: "Não foi possível salvar agora. Tente de novo em instantes." }, 500, origem);
  }
}

export async function GET() {
  return new NextResponse("Este endereço só aceita POST.", { status: 405, headers: { Allow: "POST, OPTIONS" } });
}
