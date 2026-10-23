import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarPushAoUsuario } from "@/lib/push/enviar";

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
      await servico.from("faro_avisos").insert({ user_id: d.user_id, tipo: "feedback", titulo, corpo: texto.slice(0, 500), destino: null });
      await enviarPushAoUsuario(servico, d.user_id, { title: titulo, body: texto.slice(0, 120) }).catch(() => 0);
    }
  } catch (e) {
    console.error("feedback: aviso ao dono falhou", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}
