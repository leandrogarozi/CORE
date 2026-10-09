import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DOLAR_PADRAO, MODELO_DA_IA, TETO_PADRAO_BRL, custoEmUsd, inicioDoMesISO } from "@/lib/ia/custo";
import { INSTRUCAO_DO_RESUMO, MAX_TOKENS_DO_RESUMO, materiaisParaResumir } from "@/lib/ia/resumo";
import { usoDaMensagem } from "@/lib/ia/servidor";
import { rowToKnowledgeItem } from "@/lib/board/mappers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Lê o resumo guardado. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_login" }, { status: 401 });
  const { data } = await supabase.from("settings").select("faro_resumo, faro_resumo_em").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ resumo: data?.faro_resumo ?? null, em: data?.faro_resumo_em ?? null });
}

/**
 * Escreve (ou reescreve) o resumo com a IA. Mesma proteção da conversa: só
 * logado, chave só no servidor, e BLOQUEIA ao chegar no teto do mês. O gasto
 * entra em ia_uso (função "resumo") e aparece no painel de custo.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_login" }, { status: 401 });

  const chave = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!chave) return NextResponse.json({ erro: "sem_chave" }, { status: 503 });
  if (!chave.startsWith("sk-ant-") || chave.startsWith("sk-ant-admin")) {
    return NextResponse.json({ erro: "chave_malformada" }, { status: 502 });
  }

  const servico = createServiceClient();
  const [{ data: config }, { data: usos, error: erroUso }, { data: linhas, error: erroItens }] = await Promise.all([
    servico.from("settings").select("ia_monthly_cap_brl, whatsapp_usd_brl").eq("user_id", user.id).maybeSingle(),
    servico.from("ia_uso").select("custo_brl").eq("user_id", user.id).gte("created_at", inicioDoMesISO(new Date())),
    servico.from("knowledge_items").select("*").eq("user_id", user.id).eq("status", "aprovado").is("deleted_at", null),
  ]);
  if (erroUso || erroItens) return NextResponse.json({ erro: "indisponivel" }, { status: 502 });

  const teto = Number(config?.ia_monthly_cap_brl ?? TETO_PADRAO_BRL);
  const dolar = Number(config?.whatsapp_usd_brl ?? DOLAR_PADRAO);
  const gasto = (usos ?? []).reduce((soma, u) => soma + Number(u.custo_brl), 0);
  if (gasto >= teto) return NextResponse.json({ erro: "teto", gasto, teto }, { status: 429 });

  const { texto, usados, total } = materiaisParaResumir((linhas ?? []).map(rowToKnowledgeItem));
  if (!usados) return NextResponse.json({ erro: "sem_itens" }, { status: 400 });

  let resumo = "";
  try {
    const resposta = await new Anthropic({ apiKey: chave }).messages.create({
      model: MODELO_DA_IA,
      max_tokens: MAX_TOKENS_DO_RESUMO,
      system: INSTRUCAO_DO_RESUMO,
      messages: [{ role: "user", content: `Materiais aprovados (${usados} de ${total}):\n\n${texto}` }],
      output_config: { effort: "low" },
    });
    // O gasto é gravado ANTES de qualquer outra coisa: a API já cobrou.
    const uso = usoDaMensagem(resposta.usage);
    const custoUsd = custoEmUsd(MODELO_DA_IA, uso);
    const { error } = await servico.from("ia_uso").insert({
      user_id: user.id,
      funcao: "resumo",
      modelo: MODELO_DA_IA,
      tokens_entrada: uso.entrada,
      tokens_saida: uso.saida,
      tokens_cache_leitura: uso.cacheLeitura,
      tokens_cache_escrita: uso.cacheEscrita,
      custo_usd: custoUsd,
      custo_brl: custoUsd * dolar,
    });
    if (error) console.error("ia_uso: não consegui gravar o gasto do resumo", error.message);
    resumo = resposta.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
  } catch (e) {
    console.error("IA: erro ao escrever o resumo", e instanceof Error ? e.message : e);
    const status = e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError ? "chave_invalida" : "indisponivel";
    return NextResponse.json({ erro: status }, { status: 502 });
  }
  if (!resumo) return NextResponse.json({ erro: "indisponivel" }, { status: 502 });

  const em = new Date().toISOString();
  const { error } = await supabase.from("settings").update({ faro_resumo: resumo, faro_resumo_em: em }).eq("user_id", user.id);
  if (error) return NextResponse.json({ erro: "nao_salvou" }, { status: 500 });
  return NextResponse.json({ resumo, em, usados, total });
}
