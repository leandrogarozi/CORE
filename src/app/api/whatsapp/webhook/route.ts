import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assinaturaConfere, statusesAbaixoDe, statusesDoCorpo } from "@/lib/whatsapp/webhook";

export const dynamic = "force-dynamic";

/**
 * Webhook de status da Meta.
 *
 * Existe por causa de um buraco que já custou caro: `ok: true` da Cloud API
 * significa que a Meta ACEITOU a mensagem, não que ela chegou. Foi essa cegueira
 * que escondeu 7 lembretes perdidos por três semanas, e depois um envio aceito
 * que nunca tocou o celular do Leandro. Daqui pra frente quem diz se chegou é a
 * Meta, não a nossa esperança.
 *
 * Esta rota SÓ ATUALIZA as três colunas de entrega de linhas que já existem.
 * Não cria, não apaga, não toca em nenhum outro campo.
 */

/** GET — o aperto de mão que a Meta faz uma vez, ao cadastrar a URL no painel. */
export async function GET(req: NextRequest) {
  const esperado = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!esperado) {
    // Melhor dizer "não configurado" do que aceitar qualquer um que bater aqui.
    return new NextResponse("webhook sem verify token configurado", { status: 503 });
  }
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === esperado) {
    // A Meta espera o desafio de volta como texto cru, sem aspas de JSON.
    return new NextResponse(p.get("hub.challenge") ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  // O corpo CRU, antes de qualquer parse: a assinatura é do byte a byte que
  // chegou. Reserializar o JSON mudaria espaços e a conta não bateria.
  const cru = await req.text();

  if (!assinaturaConfere(cru, req.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    // Endpoint público: sem isto, qualquer um na internet marcaria "entregue"
    // em qualquer message_id e o painel acreditaria.
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(cru);
  } catch {
    // 200 de propósito: corpo ilegível não melhora sendo reenviado pra sempre.
    return NextResponse.json({ ok: true, ignorado: "corpo não é JSON" });
  }

  const recebidos = statusesDoCorpo(corpo);
  if (!recebidos.length) {
    // A Meta manda outros eventos no mesmo canal (mensagem recebida, por
    // exemplo). Não é erro; só não é assunto nosso.
    return NextResponse.json({ ok: true, atualizados: 0 });
  }

  const supabase = createServiceClient();
  let atualizados = 0;
  const semDono: string[] = [];

  for (const s of recebidos) {
    const abaixo = statusesAbaixoDe(s.status);

    // O "só avança" vai no PRÓPRIO update, como filtro, e não num read-modify-
    // write: assim dois webhooks que chegam juntos não se atropelam.
    const campos = {
      delivery_status: s.status,
      delivery_status_at: s.em,
      ...(s.status === "failed" ? { delivery_error: s.erro } : {}),
    };
    const base = supabase.from("whatsapp_sends").update(campos).eq("message_id", s.messageId);
    const comFiltro = abaixo.length
      ? base.or(`delivery_status.is.null,delivery_status.in.(${abaixo.join(",")})`)
      : base.is("delivery_status", null);

    const { data, error } = await comFiltro.select("id");
    if (error) {
      // Uma linha que falha não pode derrubar o lote — os outros status do
      // mesmo POST continuam valendo.
      console.error("[whatsapp-webhook] falha ao atualizar", s.messageId, error.message);
      continue;
    }
    if (data?.length) atualizados += data.length;
    else semDono.push(s.messageId);
  }

  // 200 sempre que a assinatura confere: se devolvêssemos erro, a Meta
  // reenviaria o mesmo lote por horas.
  return NextResponse.json({ ok: true, recebidos: recebidos.length, atualizados, semDono: semDono.length });
}
