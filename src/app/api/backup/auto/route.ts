import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { montarBackup } from "@/lib/backup/montar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backup automático: quem chama é o script agendado no computador do dono, sem
 * sessão, com a chave gerada em Configurações.
 *
 * GET entrega o arquivo. POST só REGISTRA que o script conseguiu gravar o
 * arquivo (é esse registro que apaga o aviso de "backup não feito"). Nada aqui
 * escreve nos dados do usuário; a leitura filtra sempre pelo dono da chave.
 */
async function donoDaChave(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token.startsWith("faro_bk_")) return null;
  const { data } = await createServiceClient().from("backup_status").select("user_id").eq("token", token).maybeSingle();
  return data?.user_id ?? null;
}

export async function GET(req: NextRequest) {
  const usuario = await donoDaChave(req);
  if (!usuario) return NextResponse.json({ error: "chave inválida" }, { status: 401 });

  const { arquivo, nome, totalLinhas, completo } = await montarBackup(createServiceClient(), usuario, true);
  return new NextResponse(JSON.stringify(arquivo), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Faro-Completo": completo ? "sim" : "nao",
      "X-Faro-Linhas": String(totalLinhas),
      "X-Faro-Nome": nome,
    },
  });
}

export async function POST(req: NextRequest) {
  const usuario = await donoDaChave(req);
  if (!usuario) return NextResponse.json({ error: "chave inválida" }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { arquivo?: string; bytes?: number; linhas?: number } | null;
  const { error } = await createServiceClient()
    .from("backup_status")
    .update({
      ultimo_backup_em: new Date().toISOString(),
      ultimo_arquivo: corpo?.arquivo?.slice(0, 200) ?? null,
      ultimo_bytes: Number.isFinite(corpo?.bytes) ? Math.round(corpo!.bytes!) : null,
      ultimas_linhas: Number.isFinite(corpo?.linhas) ? Math.round(corpo!.linhas!) : null,
    })
    .eq("user_id", usuario);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
