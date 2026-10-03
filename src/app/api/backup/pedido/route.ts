import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { donoDaChave } from "@/lib/backup/dono-da-chave";

export const dynamic = "force-dynamic";

/**
 * O botão "Enviar aprendizados para o Drive agora" não escreve no Drive (o FARO
 * não tem acesso ao Drive de ninguém): ele deixa um PEDIDO aqui, e o script do
 * computador, que consulta de 15 em 15 minutos, vê o pedido e grava os arquivos.
 *
 * GET (chave de backup): o script pergunta se há pedido.
 * POST (usuário logado): o botão faz o pedido.
 */
export async function GET(req: NextRequest) {
  const usuario = await donoDaChave(req);
  if (!usuario) return NextResponse.json({ error: "chave inválida" }, { status: 401 });
  const { data } = await createServiceClient()
    .from("backup_status")
    .select("aprendizado_pedido_em")
    .eq("user_id", usuario)
    .maybeSingle();
  return NextResponse.json({ pendente: !!data?.aprendizado_pedido_em });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { data, error } = await createServiceClient()
    .from("backup_status")
    .update({ aprendizado_pedido_em: new Date().toISOString() })
    .eq("user_id", user.id)
    .not("token", "is", null)
    .select("user_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "backup automático não está ligado" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
