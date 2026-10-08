import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DOLAR_PADRAO, MODELO_DA_IA, TETO_PADRAO_BRL, inicioDoMesISO } from "@/lib/ia/custo";
import { prepararMensagens, sistemaDaConversa } from "@/lib/ia/conversa";
import { iniciarConversa } from "@/lib/ia/servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Conversa do mascote do FARO com a IA (API da Anthropic).
 *
 * A chave mora SÓ no servidor (ANTHROPIC_API_KEY na Vercel) e nunca vai ao
 * navegador. Quem chama precisa estar logado. Antes de cada fala o servidor
 * soma o gasto do mês e BLOQUEIA ao chegar no teto (padrão R$ 20, editável nas
 * Configurações). Sem chave, o app inteiro segue funcionando: só a conversa avisa.
 *
 * Respostas de erro (JSON): sem_login 401, sem_chave 503, teto 429, e os de
 * `ErroDaIA`. Resposta boa: texto em fluxo (text/plain).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_login" }, { status: 401 });

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return NextResponse.json({ erro: "sem_chave" }, { status: 503 });

  const corpo = (await req.json().catch(() => null)) as { mensagens?: unknown; resumo?: unknown } | null;
  const mensagens = prepararMensagens(corpo?.mensagens);
  if (!mensagens.length) return NextResponse.json({ erro: "mensagem_vazia" }, { status: 400 });
  const resumo = typeof corpo?.resumo === "string" ? corpo.resumo : "";

  // Teto do mês: soma do que já foi gasto + o limite que ele definiu.
  const servico = createServiceClient();
  const [{ data: config }, { data: usos, error: erroUso }] = await Promise.all([
    servico.from("settings").select("ia_monthly_cap_brl, whatsapp_usd_brl").eq("user_id", user.id).maybeSingle(),
    servico.from("ia_uso").select("custo_brl").eq("user_id", user.id).gte("created_at", inicioDoMesISO(new Date())),
  ]);
  if (erroUso) return NextResponse.json({ erro: "indisponivel" }, { status: 502 });
  const teto = Number(config?.ia_monthly_cap_brl ?? TETO_PADRAO_BRL);
  const dolar = Number(config?.whatsapp_usd_brl ?? DOLAR_PADRAO);
  const gasto = (usos ?? []).reduce((soma, u) => soma + Number(u.custo_brl), 0);
  if (gasto >= teto) {
    return NextResponse.json({ erro: "teto", gasto, teto }, { status: 429 });
  }

  const resultado = await iniciarConversa({
    anthropic: new Anthropic({ apiKey: chave }),
    sistema: sistemaDaConversa(resumo),
    mensagens,
    registrarGasto: async (g) => {
      const { error } = await servico.from("ia_uso").insert({
        user_id: user.id,
        funcao: "conversa",
        modelo: MODELO_DA_IA,
        tokens_entrada: g.uso.entrada,
        tokens_saida: g.uso.saida,
        tokens_cache_leitura: g.uso.cacheLeitura,
        tokens_cache_escrita: g.uso.cacheEscrita,
        custo_usd: g.custoUsd,
        custo_brl: g.custoUsd * dolar,
      });
      // Gravar o gasto é o que mantém o teto honesto: se falhar, vai para o log da Vercel.
      if (error) console.error("ia_uso: não consegui gravar o gasto", error.message);
    },
  });

  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
  return new Response(resultado.corpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
