import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarPushAoUsuario } from "@/lib/push/enviar";
import { cabecalhosCors, origemPermitida } from "@/lib/cadastro/validar";
import { processarCadastro } from "@/lib/cadastro/processar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Endpoint PÚBLICO de cadastro de clientes (as LPs em cadastro.leandrogarozi.com.br).
 *
 *   POST /api/cadastro   JSON: codigo (do link) OU produto (páginas antigas), nome, email,
 *                        consentimento (obrigatórios);
 *                        whatsapp, aniversario (AAAA-MM-DD), respostas_extras,
 *                        origem, texto_consentimento, chave, teste, website (isca).
 *
 * Resposta: 200 {ok:true} | 400 {ok:false, campo, erro} | 403 | 409 {ok:false, respondido:true}
 *           (link que já atingiu o limite de respostas) | 429 {ok:false, erro}
 *
 * Segurança: a chave de serviço nunca sai do servidor; CORS só para as páginas do
 * subdomínio; limite por IP e global; campo-isca `website` (bot que preenche é
 * ignorado em silêncio); a tabela tem RLS sem leitura pública. A resposta não
 * conta se a pessoa já era cadastrada (não vaza quem está na lista).
 *
 * A lógica mora em `src/lib/cadastro/processar.ts`; aqui só CORS e leitura do corpo.
 */

const TAMANHO_MAXIMO = 16 * 1024;

const cabecalhos = (origem: string | null) => cabecalhosCors(origem, "POST, OPTIONS");

function responder(corpo: object, status: number, origem: string | null) {
  return NextResponse.json(corpo, { status, headers: cabecalhos(origem) });
}

const hojeNoBrasil = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

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
  const agora = new Date();
  const r = await processarCadastro({
    corpo,
    ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido",
    supabase,
    segredo: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "faro",
    agora,
    hojeISO: hojeNoBrasil(agora),
    avisarPush: (usuario, titulo, texto) => enviarPushAoUsuario(supabase, usuario, { title: titulo, body: texto }),
  });
  return responder(r.corpo, r.status, origem);
}

export async function GET() {
  return new NextResponse("Este endereço só aceita POST.", { status: 405, headers: { Allow: "POST, OPTIONS" } });
}
