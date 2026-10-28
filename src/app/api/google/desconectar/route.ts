import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revogarToken } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/** Desliga a conexão: o Google deixa de aceitar o FARO e apagamos a autorização. Eventos já criados continuam na agenda. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const servico = createServiceClient() as unknown as SupabaseClient;
  const { data } = await servico.from("google_contas").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (data) await revogarToken(data.refresh_token);
  await servico.from("google_contas").delete().eq("user_id", user.id);
  // O vínculo tarefa ↔ evento deixa de valer: se conectar de novo, o FARO recria o que faltar.
  await servico.from("google_eventos").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
