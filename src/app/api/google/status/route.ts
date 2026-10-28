import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { credenciaisOAuth, listarAgendas, renovarToken } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/** Situação da conexão com o Google da pessoa logada, e as agendas dela (para escolher onde gravar). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const cred = credenciaisOAuth();
  if (!cred) return NextResponse.json({ ok: true, disponivel: false, conectado: false });

  const servico = createServiceClient() as unknown as SupabaseClient;
  const { data } = await servico.from("google_contas").select("email, refresh_token, calendar_id, calendar_nome, ultimo_erro").eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ ok: true, disponivel: true, conectado: false });

  let agendas: Awaited<ReturnType<typeof listarAgendas>> = [];
  let precisaReconectar = false;
  const t = await renovarToken(cred, data.refresh_token);
  if ("token" in t) agendas = await listarAgendas(t.token);
  else precisaReconectar = t.revogado;
  return NextResponse.json({
    ok: true,
    disponivel: true,
    conectado: true,
    precisaReconectar,
    email: data.email,
    agendaId: data.calendar_id,
    agendaNome: data.calendar_nome,
    erro: data.ultimo_erro,
    agendas,
  });
}
