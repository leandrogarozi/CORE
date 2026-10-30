import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MODELO_DA_IA, limitesDaIa, custoEmUsd, inicioDoMesISO } from "@/lib/ia/custo";
import { INSTRUCAO_DAS_PERGUNTAS, LIMITE_DO_TEXTO, MAX_TOKENS_DAS_PERGUNTAS, lerPerguntas } from "@/lib/ia/perguntas";
import { usoDaMensagem } from "@/lib/ia/servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cria perguntas poderosas a partir de UM texto (uma sinapse, ideia ou estudo). Nada é gravado aqui:
 * a tela mostra as perguntas e a pessoa marca para onde cada uma vai. Mesma proteção das outras
 * rotas de IA: só logado, chave só no servidor, bloqueia no teto do mês, gasto em ia_uso ("perguntas").
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_login" }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as { titulo?: unknown; texto?: unknown } | null;
  const titulo = typeof corpo?.titulo === "string" ? corpo.titulo.trim().slice(0, 300) : "";
  const texto = typeof corpo?.texto === "string" ? corpo.texto.trim() : "";
  if (texto.length < 40) return NextResponse.json({ erro: "texto_curto" }, { status: 400 });

  const chave = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!chave) return NextResponse.json({ erro: "sem_chave" }, { status: 503 });
  if (!chave.startsWith("sk-ant-") || chave.startsWith("sk-ant-admin")) {
    return NextResponse.json({ erro: "chave_malformada" }, { status: 502 });
  }

  const servico = createServiceClient();
  const [{ data: config }, { data: usos, error: erroUso }] = await Promise.all([
    servico.from("settings").select("ia_monthly_cap_brl, whatsapp_usd_brl, feature_flags").eq("user_id", user.id).maybeSingle(),
    servico.from("ia_uso").select("custo_brl").eq("user_id", user.id).gte("created_at", inicioDoMesISO(new Date())),
  ]);
  if (erroUso) return NextResponse.json({ erro: "indisponivel" }, { status: 502 });
  const { teto, dolar } = limitesDaIa(config);
  const gasto = (usos ?? []).reduce((soma, u) => soma + Number(u.custo_brl), 0);
  if (gasto >= teto) return NextResponse.json({ erro: "teto", gasto, teto }, { status: 429 });

  let perguntas: string[] = [];
  try {
    const resposta = await new Anthropic({ apiKey: chave }).messages.create({
      model: MODELO_DA_IA,
      max_tokens: MAX_TOKENS_DAS_PERGUNTAS,
      system: INSTRUCAO_DAS_PERGUNTAS,
      messages: [{ role: "user", content: `${titulo ? `Título: ${titulo}\n\n` : ""}Texto:\n${texto.slice(0, LIMITE_DO_TEXTO)}` }],
      output_config: { effort: "low" },
    });
    // O gasto é gravado ANTES de qualquer outra coisa: a API já cobrou.
    const uso = usoDaMensagem(resposta.usage);
    const custoUsd = custoEmUsd(MODELO_DA_IA, uso);
    const { error } = await servico.from("ia_uso").insert({
      user_id: user.id,
      funcao: "perguntas",
      modelo: MODELO_DA_IA,
      tokens_entrada: uso.entrada,
      tokens_saida: uso.saida,
      tokens_cache_leitura: uso.cacheLeitura,
      tokens_cache_escrita: uso.cacheEscrita,
      custo_usd: custoUsd,
      custo_brl: custoUsd * dolar,
    });
    if (error) console.error("ia_uso: não consegui gravar o gasto das perguntas", error.message);
    perguntas = lerPerguntas(
      resposta.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
    );
  } catch (e) {
    console.error("IA: erro ao criar perguntas", e instanceof Error ? e.message : e);
    const status = e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError ? "chave_invalida" : "indisponivel";
    return NextResponse.json({ erro: status }, { status: 502 });
  }
  if (!perguntas.length) return NextResponse.json({ erro: "indisponivel" }, { status: 502 });
  return NextResponse.json({ perguntas });
}
