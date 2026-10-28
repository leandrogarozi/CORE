import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { credenciaisOAuth, listarAgendas, renovarToken } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/** Troca a agenda onde o FARO grava. Corpo: { agendaId }. Só aceita uma agenda da própria conta conectada. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const cred = credenciaisOAuth();
  const corpo = (await req.json().catch(() => null)) as { agendaId?: unknown } | null;
  if (!cred || typeof corpo?.agendaId !== "string") return NextResponse.json({ ok: false, erro: "Pedido inválido." }, { status: 400 });

  const servico = createServiceClient() as unknown as SupabaseClient;
  const { data } = await servico.from("google_contas").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, erro: "Conecte o Google primeiro." }, { status: 400 });
  const t = await renovarToken(cred, data.refresh_token);
  if (!("token" in t)) return NextResponse.json({ ok: false, erro: "Conecte o Google de novo." }, { status: 400 });
  const escolhida = (await listarAgendas(t.token)).find((a) => a.id === corpo.agendaId);
  if (!escolhida) return NextResponse.json({ ok: false, erro: "Agenda não encontrada." }, { status: 400 });
  await servico.from("google_contas").update({ calendar_id: escolhida.id, calendar_nome: escolhida.nome, atualizado_em: new Date().toISOString() }).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
