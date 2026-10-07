import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * A chave do Conector FARO (o endereço que vai no Claude). GET devolve o estado
 * para o dono logado; POST cria uma chave nova e derruba a anterior. A chave só
 * LÊ o acervo do próprio dono.
 */
async function donoLogado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await donoLogado();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { data } = await createServiceClient()
    .from("backup_status")
    .select("conector_token, conector_usado_em, conector_chamadas")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    token: data?.conector_token ?? null,
    usadoEm: data?.conector_usado_em ?? null,
    chamadas: data?.conector_chamadas ?? 0,
  });
}

export async function POST() {
  const user = await donoLogado();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const token = `faro_mcp_${randomBytes(32).toString("hex")}`;
  const { error } = await createServiceClient()
    .from("backup_status")
    .upsert({ user_id: user.id, conector_token: token, conector_chamadas: 0, conector_usado_em: null }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token });
}
