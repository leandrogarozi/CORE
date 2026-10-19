import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { senhaDoDonoConfere } from "@/lib/cadastro/senha";

export const dynamic = "force-dynamic";

/**
 * Confere a senha de quem está logado. Usada antes de apagar algo que não volta
 * (ex.: pessoa da lista de Aniversários). Só responde sim ou não; não guarda nada.
 *   POST /api/senha/conferir   JSON: { senha }   ->  200 {ok:true} | 403 {ok:false}
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { senha?: unknown } | null;
  if (!(await senhaDoDonoConfere(user.email, corpo?.senha))) {
    return NextResponse.json({ ok: false, erro: "Senha incorreta." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
