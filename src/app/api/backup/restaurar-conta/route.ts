import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { donoLogado } from "@/lib/supabase/dono";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** As cópias diárias guardadas no banco para a conta do dono (mais nova primeiro). */
export async function GET() {
  const userId = await donoLogado();
  if (!userId) return NextResponse.json({ ok: false, erro: "Só o dono usa o restaurador." }, { status: 403 });
  // A tabela de cópias não está nos tipos gerados (só o servidor a acessa), por isso o cliente sem tipos.
  const servico = createServiceClient() as unknown as SupabaseClient;
  const { data, error } = await servico
    .from("faro_backups_internos")
    .select("dia, tabelas, linhas, criado_em")
    .eq("user_id", userId)
    .order("dia", { ascending: false });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, copias: data ?? [] });
}

/**
 * Corpo: { dia: "AAAA-MM-DD", simular: boolean }. Traz de volta só o que SUMIU da conta desde aquela cópia;
 * nunca sobrescreve o que existe hoje. Com `simular` não grava nada (a função desfaz tudo no fim).
 */
export async function POST(req: NextRequest) {
  const userId = await donoLogado();
  if (!userId) return NextResponse.json({ ok: false, erro: "Só o dono usa o restaurador." }, { status: 403 });
  const corpo = (await req.json().catch(() => null)) as { dia?: unknown; simular?: unknown } | null;
  const dia = typeof corpo?.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(corpo.dia) ? corpo.dia : null;
  if (!dia) return NextResponse.json({ ok: false, erro: "Escolha o dia da cópia." }, { status: 400 });
  const { data, error } = await (createServiceClient() as unknown as SupabaseClient).rpc("faro_restaurar_conta", {
    p_user: userId,
    p_dia: dia,
    p_simular: corpo?.simular !== false,
  });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json(data);
}
