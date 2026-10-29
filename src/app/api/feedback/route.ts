import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarPushAoUsuario } from "@/lib/push/enviar";
import { donoLogado } from "@/lib/supabase/dono";

export const dynamic = "force-dynamic";

const TIPOS = ["problema", "ideia", "duvida", "elogio", "credito"] as const;
const ROTULO: Record<(typeof TIPOS)[number], string> = {
  problema: "Problema",
  ideia: "Ideia",
  duvida: "Dúvida",
  elogio: "Elogio",
  credito: "Pedido de crédito de WhatsApp",
};
// Anti-spam simples: no máximo 10 mensagens por pessoa por dia.
const LIMITE_POR_DIA = 10;

/**
 * Feedback de quem usa o FARO. Grava em `faro_feedback` (só o servidor lê) e avisa quem é "dono"
 * (conta com `modo_dono` ligado nas configurações): caixa de Avisos + push. Exige login.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_login" }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as { tipo?: unknown; texto?: unknown; pagina?: unknown } | null;
  const texto = typeof corpo?.texto === "string" ? corpo.texto.trim().slice(0, 4000) : "";
  if (texto.length < 3) return NextResponse.json({ erro: "texto_curto" }, { status: 400 });
  const tipo = TIPOS.find((t) => t === corpo?.tipo) ?? "ideia";
  const pagina = typeof corpo?.pagina === "string" ? corpo.pagina.slice(0, 80) : null;
  const aparelho = (req.headers.get("user-agent") ?? "").slice(0, 200) || null;

  const servico = createServiceClient();
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await servico
    .from("faro_feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("criado_em", desde);
  if ((count ?? 0) >= LIMITE_POR_DIA) return NextResponse.json({ erro: "limite" }, { status: 429 });

  const { error } = await servico.from("faro_feedback").insert({ user_id: user.id, tipo, texto, pagina, aparelho });
  if (error) {
    console.error("feedback: não gravei", error.message);
    return NextResponse.json({ erro: "falhou" }, { status: 500 });
  }

  // Avisa o(s) dono(s). Falha no aviso nunca desfaz o feedback.
  try {
    const { data: donos } = await servico.from("settings").select("user_id").eq("feature_flags->>modo_dono", "true");
    for (const d of donos ?? []) {
      const titulo = `Feedback (${ROTULO[tipo]})`;
      await servico.from("faro_avisos").insert({ user_id: d.user_id, tipo: "feedback", titulo, corpo: texto.slice(0, 500), destino: "feedbacks" });
      await enviarPushAoUsuario(servico, d.user_id, { title: titulo, body: texto.slice(0, 120) }).catch(() => 0);
    }
  } catch (e) {
    console.error("feedback: aviso ao dono falhou", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}

/** Todos os feedbacks recebidos (só o dono), do mais novo para o mais antigo, com quem mandou. */
export async function GET() {
  if (!(await donoLogado())) return NextResponse.json({ erro: "so_dono" }, { status: 403 });
  const servico = createServiceClient();
  const { data, error } = await servico
    .from("faro_feedback")
    .select("id, user_id, tipo, texto, pagina, aparelho, criado_em, lido_em")
    .order("criado_em", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  // E-mail de quem mandou (a conta pode já ter sido apagada: aí vai sem e-mail).
  const emails = new Map<string, string>();
  const { data: lista } = await servico.auth.admin.listUsers({ perPage: 1000 });
  for (const u of lista?.users ?? []) if (u.email) emails.set(u.id, u.email);
  return NextResponse.json({
    ok: true,
    feedbacks: (data ?? []).map((f) => ({ ...f, email: emails.get(f.user_id) ?? null })),
  });
}

/** Marca como lido/resolvido (lido = true) ou volta para novo (lido = false). Corpo: { id, lido }. */
export async function PATCH(req: NextRequest) {
  if (!(await donoLogado())) return NextResponse.json({ erro: "so_dono" }, { status: 403 });
  const corpo = (await req.json().catch(() => null)) as { id?: unknown; lido?: unknown } | null;
  if (typeof corpo?.id !== "string" || typeof corpo.lido !== "boolean") return NextResponse.json({ erro: "pedido_invalido" }, { status: 400 });
  const { error } = await createServiceClient()
    .from("faro_feedback")
    .update({ lido_em: corpo.lido ? new Date().toISOString() : null })
    .eq("id", corpo.id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
