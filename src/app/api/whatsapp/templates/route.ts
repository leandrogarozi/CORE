import { NextRequest, NextResponse } from "next/server";

/**
 * Diagnóstico: lista os templates que o Meta enxerga na conta do número que o
 * app usa pra enviar. Serve pra responder "por que o envio diz que o template
 * não existe?" com dado em vez de palpite — nome e idioma precisam bater
 * exatamente, e o template tem que estar na MESMA conta (WABA) do número.
 *
 * Protegida pelo CRON_SECRET, igual à rota de disparo: não é rota de usuário.
 */
export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return NextResponse.json({ error: "WhatsApp não configurado no servidor" }, { status: 500 });
  }
  const headers = { Authorization: `Bearer ${token}` };

  // A WABA pode vir na URL (?waba=...) ou ser descoberta a partir do número.
  let wabaId = req.nextUrl.searchParams.get("waba");
  const phoneRes = await fetch(
    `${GRAPH}/${phoneNumberId}?fields=id,display_phone_number,verified_name,whatsapp_business_account`,
    { headers }
  );
  const phone = await phoneRes.json().catch(() => null);
  if (!wabaId) wabaId = phone?.whatsapp_business_account?.id ?? null;

  if (!wabaId) {
    return NextResponse.json({
      numero: phone,
      erro: "Não consegui descobrir a conta (WABA) do número. Chame de novo com ?waba=<id>.",
    });
  }

  const tplRes = await fetch(
    `${GRAPH}/${wabaId}/message_templates?fields=name,language,status,category&limit=50`,
    { headers }
  );
  const templates = await tplRes.json().catch(() => null);

  return NextResponse.json({
    numero: { id: phone?.id, telefone: phone?.display_phone_number, nome: phone?.verified_name },
    waba: wabaId,
    templates: templates?.data ?? templates,
  });
}
