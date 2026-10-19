import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { senhaDoDonoConfere } from "@/lib/cadastro/senha";
import type { Json } from "@/lib/database.types";

export const dynamic = "force-dynamic";

/**
 * Apaga UM link de cadastro. Só o dono logado, e só com a senha do login (conferida aqui).
 *   POST /api/cadastro/apagar-link   JSON: { id, senha }
 * As respostas que as pessoas deram por esse link saem junto das fichas (sem o link, as perguntas se perdem e
 * viravam lixo na ficha de quem respondeu).
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

  const { data: link } = await supabase.from("cadastro_links").select("codigo").eq("user_id", user.id).eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("cadastro_links").delete().eq("user_id", user.id).eq("id", id).select("id");
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

  // Tira das fichas as respostas desse link (a chave é o código do link).
  if (link?.codigo && data?.length) {
    const { data: fichas } = await supabase.from("clientes_cadastro").select("id, respostas_extras").eq("user_id", user.id);
    for (const f of fichas ?? []) {
      const extras = f.respostas_extras;
      if (!extras || typeof extras !== "object" || Array.isArray(extras) || !(link.codigo in extras)) continue;
      const { [link.codigo]: _tirar, ...resto } = extras as Record<string, Json>;
      void _tirar;
      await supabase.from("clientes_cadastro").update({ respostas_extras: resto }).eq("id", f.id);
    }
  }
  return NextResponse.json({ ok: true, apagados: data?.length ?? 0 });
}
