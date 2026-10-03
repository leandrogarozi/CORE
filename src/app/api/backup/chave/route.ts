import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Estado do backup automático e a chave dele.
 *
 * GET devolve o estado (e a chave, só para o dono, que já está logado) para a
 * tela de Configurações. POST cria uma chave nova e invalida a anterior.
 * A chave só serve para LER o backup do próprio dono e registrar que ele foi
 * feito: não existe caminho com ela que escreva ou apague dados.
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
    .select("token, ultimo_backup_em, ultimo_bytes, ultimas_linhas, ultimo_arquivo")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    configurado: !!data?.token,
    token: data?.token ?? null,
    ultimoEm: data?.ultimo_backup_em ?? null,
    ultimoBytes: data?.ultimo_bytes ?? null,
    ultimasLinhas: data?.ultimas_linhas ?? null,
    ultimoArquivo: data?.ultimo_arquivo ?? null,
  });
}

export async function POST() {
  const user = await donoLogado();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const token = `faro_bk_${randomBytes(32).toString("hex")}`;
  const { error } = await createServiceClient()
    .from("backup_status")
    .upsert({ user_id: user.id, token }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token });
}
