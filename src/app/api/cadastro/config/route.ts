import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cabecalhosCors, origemPermitida } from "@/lib/cadastro/validar";
import { lerPerguntas } from "@/lib/cadastro/links";

export const dynamic = "force-dynamic";

/**
 * Configuração PÚBLICA de um link de cadastro, para a página saber o que mostrar.
 *
 *   GET /api/cadastro/config?c=<codigo>
 *
 * Resposta: { ok:true, ativo, respondido, eyebrow, titulo, boas_vindas, perguntas:[{id,texto,tipo,opcional}] }
 * Código que não existe ou está desativado: { ok:true, ativo:false } (sem dizer qual dos dois).
 * Link que já atingiu o limite de respostas: respondido:true.
 *
 * Só devolve os textos que o dono escreveu para a página; nada de dados de pessoas.
 * Mesmo CORS do POST e limite próprio por IP (60 consultas em 10 min), para ninguém
 * ficar testando códigos.
 */

const LIMITE_POR_IP = 60;
const metodos = "GET, OPTIONS";

function responder(corpo: object, status: number, origem: string | null) {
  return NextResponse.json(corpo, { status, headers: cabecalhosCors(origem, metodos) });
}

export async function OPTIONS(req: NextRequest) {
  const origem = req.headers.get("origin");
  if (!origemPermitida(origem)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: cabecalhosCors(origem, metodos) });
}

export async function GET(req: NextRequest) {
  const origem = req.headers.get("origin");
  if (!origemPermitida(origem)) return responder({ ok: false, erro: "Origem não permitida." }, 403, null);

  const codigo = (req.nextUrl.searchParams.get("c") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(codigo) || codigo.length > 80) return responder({ ok: true, ativo: false }, 200, origem);

  const supabase = createServiceClient();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
  const ipHash = "cfg:" + createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "faro").update(ip).digest("hex").slice(0, 28);
  const { count } = await supabase
    .from("cadastro_tentativas")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("criado_em", new Date(Date.now() - 10 * 60000).toISOString());
  if ((count ?? 0) >= LIMITE_POR_IP) return responder({ ok: false, erro: "Muitas consultas. Tente de novo em alguns minutos." }, 429, origem);
  await supabase.from("cadastro_tentativas").insert({ ip_hash: ipHash });

  const { data: link } = await supabase.from("cadastro_links").select("*").eq("codigo", codigo).maybeSingle();
  if (!link || !link.ativo) return responder({ ok: true, ativo: false }, 200, origem);

  const respondido = link.respostas_count >= link.limit_respostas;
  return responder(
    {
      ok: true,
      ativo: true,
      respondido,
      eyebrow: link.eyebrow,
      titulo: link.titulo,
      boas_vindas: link.boas_vindas,
      perguntas: respondido ? [] : lerPerguntas(link.perguntas).map((p) => ({ id: p.id, texto: p.texto, tipo: p.tipo, opcional: p.opcional })),
    },
    200,
    origem
  );
}
