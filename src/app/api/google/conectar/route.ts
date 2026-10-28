import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { credenciaisOAuth, enderecoDeAutorizacao, gerarEstado } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/** Começa o "Conectar com o Google": leva a pessoa (já logada no FARO) para a tela de permissão do Google. */
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const cred = credenciaisOAuth();
  if (!cred) return NextResponse.redirect(`${origin}/?google=indisponivel`);
  return NextResponse.redirect(enderecoDeAutorizacao(cred, origin, gerarEstado(user.id), user.email ?? undefined));
}
