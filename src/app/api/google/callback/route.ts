import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { credenciaisOAuth, lerEstado, listarAgendas, trocarCodigo } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/** A volta do Google: troca o código pela autorização e guarda. Termina na tela inicial com ?google=ok (ou um erro). */
export async function GET(req: NextRequest) {
  const { origin, searchParams } = new URL(req.url);
  const volta = (r: string) => NextResponse.redirect(`${origin}/?google=${r}`);
  const cred = credenciaisOAuth();
  if (!cred) return volta("indisponivel");
  if (searchParams.get("error")) return volta("negado"); // a pessoa clicou em "Cancelar" ou o Google a bloqueou

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  // O estado assinado garante que quem volta é quem clicou em "Conectar".
  if (lerEstado(searchParams.get("state")) !== user.id) return volta("erro");
  const codigo = searchParams.get("code");
  if (!codigo) return volta("erro");

  const t = await trocarCodigo(cred, codigo, origin);
  if (!t.ok || !t.access_token) return volta("erro");
  const servico = createServiceClient() as unknown as SupabaseClient;

  // O Google só entrega refresh_token no primeiro consentimento; sem ele mantém o que já temos guardado.
  let refresh = t.refresh_token;
  if (!refresh) {
    const { data } = await servico.from("google_contas").select("refresh_token").eq("user_id", user.id).maybeSingle();
    refresh = data?.refresh_token;
  }
  if (!refresh) return volta("erro");

  const agendas = await listarAgendas(t.access_token);
  const principal = agendas.find((a) => a.principal) ?? agendas[0];
  if (!principal) return volta("sem-agenda");
  const { error } = await servico.from("google_contas").upsert({
    user_id: user.id,
    email: principal.id.includes("@") ? principal.id : null,
    refresh_token: refresh,
    calendar_id: principal.id,
    calendar_nome: principal.nome,
    ultimo_erro: null,
    atualizado_em: new Date().toISOString(),
  });
  return volta(error ? "erro" : "ok");
}
