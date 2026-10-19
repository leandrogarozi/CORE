import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { senhaDoDonoConfere } from "@/lib/cadastro/senha";

export const dynamic = "force-dynamic";

/**
 * Apaga UM link de cadastro. Só o dono logado, e só com a senha do login (conferida aqui).
 *   POST /api/cadastro/apagar-link   JSON: { id, senha }
 * As respostas já enviadas ficam em `clientes_cadastro`; só o link some.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, erro: "Não autenticado." }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as { id?: unknown; senha?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id : "";
  if (!id) return NextResponse.json({ ok: false, erro: "Informe o link." }, { status: 400 });
  if (!(await senhaDoDonoConfere(user.email, corpo?.senha))) {
    return NextResponse.json({ ok: false, erro: "Senha incorreta." }, { status: 403 });
  }

  const { data, error } = await supabase.from("cadastro_links").delete().eq("user_id", user.id).eq("id", id).select("id");
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, apagados: data?.length ?? 0 });
}
