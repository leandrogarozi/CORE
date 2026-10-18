import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lerArquivoDeRestauracao, restaurarCadastros } from "@/lib/cadastro/restaurar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Traz de volta os cadastros (clientes e links) a partir de um arquivo de backup.
 * Só o dono, logado. Corpo: o arquivo `CRM clientes/crm-clientes.json` ou o backup
 * completo (faro-backup-*.json). Grava por id, então rodar duas vezes não duplica.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, erro: "Não autenticado." }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  const arquivo = lerArquivoDeRestauracao(corpo);
  if (!arquivo) return NextResponse.json({ ok: false, erro: "Arquivo não reconhecido." }, { status: 400 });
  try {
    const r = await restaurarCadastros(supabase, user.id, arquivo);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : "Falha ao restaurar." }, { status: 500 });
  }
}
