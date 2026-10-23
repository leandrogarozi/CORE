import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppTestMessage } from "@/lib/whatsapp/send";
import { decidirEnvio, tetoGlobalDoAmbiente, textoDoBloqueio } from "@/lib/whatsapp/credito";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { data: settings, error } = await supabase.from("settings").select("notify_phone, feature_flags").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!settings?.notify_phone) {
    return NextResponse.json({ error: "Cadastre seu WhatsApp/telefone no Perfil primeiro" }, { status: 400 });
  }

  // Mesma regra dos lembretes: quem não é o dono precisa de aceite e de crédito (o teste também custa uma mensagem).
  const flags = (settings.feature_flags ?? {}) as Record<string, unknown>;
  const servico = createServiceClient();
  const [{ data: cred }, { count: usadas }, { count: geral }] = await Promise.all([
    servico.from("whatsapp_creditos").select("mensagens_concedidas").eq("user_id", user.id).maybeSingle(),
    servico.from("whatsapp_sends").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("ok", true),
    servico.from("whatsapp_sends").select("id", { count: "exact", head: true }).eq("ok", true).gte("sent_at", new Date(Date.now() - 31 * 86400000).toISOString()),
  ]);
  const decisao = decidirEnvio({
    dono: flags.modo_dono === true,
    aceitou: flags.whatsapp_aceite === true,
    saldo: Number(cred?.mensagens_concedidas ?? 0) - (usadas ?? 0),
    enviadasNoMesGeral: geral ?? 0,
    tetoGlobal: tetoGlobalDoAmbiente(),
  });
  if (!decisao.pode) return NextResponse.json({ error: textoDoBloqueio(decisao.motivo) }, { status: 403 });

  const result = await sendWhatsAppTestMessage(settings.notify_phone);

  // O teste tem que deixar rastro igual ao envio de verdade. Sem linha em
  // whatsapp_sends não existe `message_id`, e sem `message_id` o webhook de
  // status recebe o evento da Meta e não acha o que atualizar — o teste chega
  // no celular e não prova nada do caminho de volta. Era exatamente esse o
  // ponto cego quando a gente foi conferir se o webhook estava funcionando.
  // Grava pelo servidor, não pelo cliente do usuário: `whatsapp_sends` só tem
  // política de leitura, e é de propósito. É por essa tabela que o teto de
  // gasto do mês é contado — abrir INSERT pro navegador seria deixar o próprio
  // front forjar linha de gasto. Quem decide que houve envio é o servidor, que
  // acabou de autenticar o usuário logo acima.
  const { error: ledgerError } = await createServiceClient().from("whatsapp_sends").insert({
    user_id: user.id,
    reminder_id: null,
    kind: "teste",
    template: "faro_teste",
    ok: result.ok,
    error: result.ok ? null : result.error,
    message_id: result.ok ? result.messageId : null,
    wa_id: result.ok ? result.waId : null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  // O registro falhar não invalida a mensagem, que já saiu — mas quem clicou
  // precisa saber que o rastro não ficou, senão vai cobrar um status que nunca
  // vai aparecer.
  return NextResponse.json({ ok: true, registrado: !ledgerError });
}
