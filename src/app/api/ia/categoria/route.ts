import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MODELO_DA_IA, limitesDaIa, custoEmUsd, inicioDoMesISO } from "@/lib/ia/custo";
import { INSTRUCAO_DA_CATEGORIA, MAXIMO_DE_NOTAS_POR_PEDIDO, MAX_TOKENS_DA_CATEGORIA, lerCategorias, pareceSaude } from "@/lib/ia/categoria";
import { usoDaMensagem } from "@/lib/ia/servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dá uma categoria para algumas anotações. Nada é gravado aqui: a tela recebe {id: categoria} e grava.
 * Mesma proteção das outras rotas de IA: só logado, chave só no servidor, bloqueia no teto do mês,
 * gasto em ia_uso ("categoria"). Texto de saúde nem chega à IA.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_login" }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as { notas?: unknown; existentes?: unknown } | null;
  const notas = (Array.isArray(corpo?.notas) ? corpo.notas : [])
    .map((n) => n as { id?: unknown; texto?: unknown })
    .filter((n) => typeof n.id === "string" && typeof n.texto === "string" && n.texto.trim())
    .map((n) => ({ id: n.id as string, texto: (n.texto as string).trim().slice(0, 500) }))
    .filter((n) => !pareceSaude(n.texto))
    .slice(0, MAXIMO_DE_NOTAS_POR_PEDIDO);
  if (!notas.length) return NextResponse.json({ categorias: {} });
  const existentes = (Array.isArray(corpo?.existentes) ? corpo.existentes : [])
    .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
    .map((e) => e.trim().slice(0, 30))
    .slice(0, 30);

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

  try {
    const resposta = await new Anthropic({ apiKey: chave }).messages.create({
      model: MODELO_DA_IA,
      max_tokens: MAX_TOKENS_DA_CATEGORIA,
      system: INSTRUCAO_DA_CATEGORIA,
      messages: [
        {
          role: "user",
          content: `Categorias que ela já usa: ${existentes.length ? existentes.join(", ") : "(nenhuma ainda)"}\n\nAnotações:\n${notas
            .map((n, i) => `${i + 1}. ${n.texto.replace(/\s+/g, " ")}`)
            .join("\n")}`,
        },
      ],
      output_config: { effort: "low" },
    });
    // O gasto é gravado ANTES de qualquer outra coisa: a API já cobrou.
    const uso = usoDaMensagem(resposta.usage);
    const custoUsd = custoEmUsd(MODELO_DA_IA, uso);
    const { error } = await servico.from("ia_uso").insert({
      user_id: user.id,
      funcao: "categoria",
      modelo: MODELO_DA_IA,
      tokens_entrada: uso.entrada,
      tokens_saida: uso.saida,
      tokens_cache_leitura: uso.cacheLeitura,
      tokens_cache_escrita: uso.cacheEscrita,
      custo_usd: custoUsd,
      custo_brl: custoUsd * dolar,
    });
    if (error) console.error("ia_uso: não consegui gravar o gasto da categoria", error.message);
    const saida = resposta.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return NextResponse.json({ categorias: lerCategorias(saida, notas.map((n) => n.id)) });
  } catch (e) {
    console.error("IA: erro ao categorizar anotações", e instanceof Error ? e.message : e);
    const status = e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError ? "chave_invalida" : "indisponivel";
    return NextResponse.json({ erro: status }, { status: 502 });
  }
}
