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

  const phoneRes = await fetch(`${GRAPH}/${phoneNumberId}?fields=id,display_phone_number,verified_name`, {
    headers,
  });
  const phone = await phoneRes.json().catch(() => null);

  // O nó do número não expõe a conta (WABA). O debug_token expõe: as permissões
  // do token vêm com os ids das contas a que ele dá acesso.
  const fromUrl = req.nextUrl.searchParams.get("waba");
  let wabaIds: string[] = fromUrl ? [fromUrl] : [];
  let debug: unknown = null;
  if (!wabaIds.length) {
    const dbgRes = await fetch(`${GRAPH}/debug_token?input_token=${token}`, { headers });
    const dbg = await dbgRes.json().catch(() => null);
    debug = dbg?.data?.error ?? dbg?.error ?? null;
    const scopes: { scope: string; target_ids?: string[] }[] = dbg?.data?.granular_scopes ?? [];
    wabaIds = [
      ...new Set(
        scopes
          .filter((g) => g.scope.startsWith("whatsapp_business"))
          .flatMap((g) => g.target_ids ?? [])
      ),
    ];
  }

  if (!wabaIds.length) {
    return NextResponse.json({
      numero: phone,
      debug,
      erro: "Não achei nenhuma conta (WABA) no token. Chame de novo com ?waba=<id>.",
    });
  }

  const contas = [];
  for (const wabaId of wabaIds) {
    const tplRes = await fetch(
      `${GRAPH}/${wabaId}/message_templates?fields=name,language,status,category&limit=50`,
      { headers }
    );
    const tpl = await tplRes.json().catch(() => null);
    contas.push({
      waba: wabaId,
      templates:
        tpl?.data?.map((t: { name: string; language: string; status: string; category: string }) => ({
          nome: t.name,
          idioma: t.language,
          status: t.status,
          categoria: t.category,
        })) ?? tpl,
    });
  }

  return NextResponse.json({
    numero: { id: phone?.id, telefone: phone?.display_phone_number, nome: phone?.verified_name },
    contas,
  });
}
