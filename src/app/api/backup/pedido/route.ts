import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { donoDaChave } from "@/lib/backup/dono-da-chave";
import { dataEHoraLocais, diaLocal } from "@/lib/backup/aviso";

export const dynamic = "force-dynamic";

/**
 * O botão "Enviar aprendizados para o Drive agora" não escreve no Drive (o FARO
 * não tem acesso ao Drive de ninguém): ele deixa um PEDIDO aqui, e o script do
 * computador, que consulta de 15 em 15 minutos, vê o pedido e grava os arquivos.
 *
 * GET (chave de backup): o script pergunta se há pedido e se já houve backup hoje.
 * POST (usuário logado): o botão faz o pedido.
 */
export async function GET(req: NextRequest) {
  const usuario = await donoDaChave(req);
  if (!usuario) return NextResponse.json({ error: "chave inválida" }, { status: 401 });
  const supabase = createServiceClient();
  const [{ data }, { data: cfg }] = await Promise.all([
    supabase.from("backup_status").select("aprendizado_pedido_em, ultimo_backup_em").eq("user_id", usuario).maybeSingle(),
    supabase.from("settings").select("timezone").eq("user_id", usuario).maybeSingle(),
  ]);
  const zona = cfg?.timezone || "America/Sao_Paulo";
  // "Hoje" no fuso do dono: é o servidor, e não cada computador, quem diz se já
  // existe backup do dia, para dois Macs não fazerem dois.
  const backupHoje = !!data?.ultimo_backup_em && diaLocal(data.ultimo_backup_em, zona) >= dataEHoraLocais(Date.now(), zona).data;
  return NextResponse.json({ pendente: !!data?.aprendizado_pedido_em, backupHoje });
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
