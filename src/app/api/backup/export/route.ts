import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { montarBackup } from "@/lib/backup/montar";

export const dynamic = "force-dynamic";

/**
 * Exportação completa dos dados do usuário, em JSON.
 *
 * Esta rota SÓ LÊ. Não existe aqui nenhum caminho que escreva, apague ou altere
 * — e isso é decisão de projeto, não acaso: um backup que consegue estragar o
 * que está salvo não é backup. É por isso que ela pode rodar a qualquer hora,
 * inclusive com o Leandro usando o app.
 *
 * Usa o cliente do usuário logado (nunca o service role), então é o próprio RLS
 * do banco que garante que cada um exporta só as próprias linhas. A rota não
 * precisa filtrar nada por conta própria, e não tem como vazar dado de outro.
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { arquivo, nome } = await montarBackup(supabase, user.id, false);
  return new NextResponse(JSON.stringify(arquivo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
