import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DIAS_DE_NOVIDADE, NOVIDADES } from "@/lib/novidades";

export const dynamic = "force-dynamic";

/**
 * Entrega à pessoa logada as novidades que ela ainda não recebeu, como aviso na caixa de Avisos.
 * A chamada é feita pelo app ao abrir; sem novidade nova, não grava nada. Idempotente: o tipo `novidade:<id>` é a chave.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_login" }, { status: 401 });

  const hoje = new Date().toISOString().slice(0, 10);
  const criadaEm = (user.created_at ?? "").slice(0, 10);
  const candidatas = NOVIDADES.filter(
    (n) => (!criadaEm || n.data >= criadaEm) && Math.round((Date.parse(hoje) - Date.parse(n.data)) / 86400000) <= DIAS_DE_NOVIDADE
  );
  if (!candidatas.length) return NextResponse.json({ novos: 0 });

  const servico = createServiceClient();
  const tipos = candidatas.map((n) => `novidade:${n.id}`);
  const { data: ja } = await servico.from("faro_avisos").select("tipo").eq("user_id", user.id).in("tipo", tipos);
  const jaTem = new Set((ja ?? []).map((a) => a.tipo));
  let faltam = candidatas.filter((n) => !jaTem.has(`novidade:${n.id}`));
  if (!faltam.length) return NextResponse.json({ novos: 0 });

  // Quem mandou um feedback que esta atualização resolveu já recebe o aviso de "feedback resolvido": não repete.
  const idsFeedback = faltam.flatMap((n) => n.feedbackIds ?? []);
  if (idsFeedback.length) {
    const { data: meus } = await servico.from("faro_feedback").select("id").eq("user_id", user.id).in("id", idsFeedback);
    const meusIds = new Set((meus ?? []).map((f) => f.id));
    faltam = faltam.filter((n) => !(n.feedbackIds ?? []).some((id) => meusIds.has(id)));
  }
  if (!faltam.length) return NextResponse.json({ novos: 0 });

  const { error } = await servico
    .from("faro_avisos")
    .insert(faltam.map((n) => ({ user_id: user.id, tipo: `novidade:${n.id}`, titulo: n.titulo, corpo: n.corpo, destino: null })));
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ novos: faltam.length });
}
