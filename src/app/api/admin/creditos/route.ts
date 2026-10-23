import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CREDITO_INICIAL, saldoDe } from "@/lib/whatsapp/credito";

export const dynamic = "force-dynamic";

/**
 * Painel do dono: crédito de WhatsApp de cada pessoa.
 *   GET  -> lista (e-mail, nome, aceite, concedidas, usadas, saldo)
 *   POST -> { user_id, mensagens } soma mensagens ao crédito da pessoa (1 a 1000)
 * Só quem tem `feature_flags.modo_dono` (marca que o banco protege contra edição pelo app) entra.
 */
async function donoLogado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await createServiceClient().from("settings").select("feature_flags").eq("user_id", user.id).maybeSingle();
  const flags = (data?.feature_flags ?? {}) as Record<string, unknown>;
  return flags.modo_dono === true ? user : null;
}

export async function GET() {
  if (!(await donoLogado())) return NextResponse.json({ erro: "proibido" }, { status: 403 });
  const servico = createServiceClient();
  const [{ data: configs }, { data: creditos }, { data: envios }, usuarios] = await Promise.all([
    servico.from("settings").select("user_id, preferred_name, notify_phone, feature_flags"),
    servico.from("whatsapp_creditos").select("user_id, mensagens_concedidas"),
    servico.from("whatsapp_sends").select("user_id").eq("ok", true).limit(20000),
    servico.auth.admin.listUsers({ perPage: 200 }),
  ]);
  const emailPor = new Map((usuarios.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const concedidasPor = new Map((creditos ?? []).map((c) => [c.user_id, Number(c.mensagens_concedidas)]));
  const usadasPor = new Map<string, number>();
  for (const e of envios ?? []) usadasPor.set(e.user_id, (usadasPor.get(e.user_id) ?? 0) + 1);
  const pessoas = (configs ?? []).map((c) => {
    const flags = (c.feature_flags ?? {}) as Record<string, unknown>;
    const usadas = usadasPor.get(c.user_id) ?? 0;
    return {
      user_id: c.user_id,
      email: emailPor.get(c.user_id) ?? "",
      nome: c.preferred_name ?? "",
      telefone: !!c.notify_phone,
      aceitou: flags.whatsapp_aceite === true,
      dono: flags.modo_dono === true,
      concedidas: concedidasPor.get(c.user_id) ?? CREDITO_INICIAL,
      usadas,
      saldo: saldoDe(concedidasPor.get(c.user_id), usadas),
    };
  });
  return NextResponse.json({ pessoas });
}

export async function POST(req: NextRequest) {
  if (!(await donoLogado())) return NextResponse.json({ erro: "proibido" }, { status: 403 });
  const corpo = (await req.json().catch(() => null)) as { user_id?: unknown; mensagens?: unknown } | null;
  const alvo = typeof corpo?.user_id === "string" ? corpo.user_id : "";
  const n = Number(corpo?.mensagens);
  if (!/^[0-9a-f-]{36}$/i.test(alvo) || !Number.isInteger(n) || n < 1 || n > 1000) {
    return NextResponse.json({ erro: "dados_invalidos" }, { status: 400 });
  }
  const servico = createServiceClient();
  const { data: atual } = await servico.from("whatsapp_creditos").select("mensagens_concedidas").eq("user_id", alvo).maybeSingle();
  const novo = Number(atual?.mensagens_concedidas ?? CREDITO_INICIAL) + n;
  const { error } = await servico
    .from("whatsapp_creditos")
    .upsert({ user_id: alvo, mensagens_concedidas: novo, aviso_baixo_em: null, atualizado_em: new Date().toISOString() });
  if (error) return NextResponse.json({ erro: "falhou" }, { status: 500 });
  return NextResponse.json({ ok: true, concedidas: novo });
}
