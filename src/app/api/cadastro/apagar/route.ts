import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Apaga o cadastro de UMA pessoa (pedido de exclusão, LGPD). Só o dono do FARO,
 * logado, pode chamar.
 *
 *   POST /api/cadastro/apagar   JSON: { email } ou { whatsapp } ou { id }
 *
 * Remove a linha de `clientes_cadastro` de verdade (não é "lixeira") e também o
 * aniversário e o lembrete que ela gerou na lista de Aniversários.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, erro: "Não autenticado." }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as { id?: unknown; email?: unknown; whatsapp?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id : "";
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  const zap = typeof corpo?.whatsapp === "string" ? corpo.whatsapp.replace(/\D/g, "") : "";
  if (!id && !email && !zap) return NextResponse.json({ ok: false, erro: "Informe id, email ou whatsapp." }, { status: 400 });

  // RLS já limita ao próprio dono; o filtro por user_id é só cinto e suspensório.
  let consulta = supabase.from("clientes_cadastro").select("id, birthday_id").eq("user_id", user.id);
  if (id) consulta = consulta.eq("id", id);
  else if (email) consulta = consulta.eq("email_norm", email);
  else consulta = consulta.like("whatsapp_norm", `%${zap}`);
  const { data: linhas, error } = await consulta;
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  if (!linhas?.length) return NextResponse.json({ ok: true, apagados: 0 });

  const birthdays = linhas.map((l) => l.birthday_id).filter((b): b is string => !!b);
  if (birthdays.length) {
    await supabase.from("reminders").delete().eq("user_id", user.id).eq("source_kind", "birthday").in("source_id", birthdays);
    await supabase.from("birthdays").update({ deleted_at: new Date().toISOString() }).eq("user_id", user.id).in("id", birthdays);
  }
  const { error: erroApagar } = await supabase.from("clientes_cadastro").delete().eq("user_id", user.id).in("id", linhas.map((l) => l.id));
  if (erroApagar) return NextResponse.json({ ok: false, erro: erroApagar.message }, { status: 500 });
  return NextResponse.json({ ok: true, apagados: linhas.length });
}
