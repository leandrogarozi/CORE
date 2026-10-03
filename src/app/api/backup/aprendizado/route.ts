import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createServiceClient } from "@/lib/supabase/service";
import { donoDaChave } from "@/lib/backup/dono-da-chave";
import { rowToBook, rowToSynapse } from "@/lib/board/mappers";
import { AREAS_PADRAO, arquivosDoBackup, ehAreaDeBackup } from "@/lib/learning-export";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Textos de aprendizado (sinapses e resumos de livro) para o script do
 * computador gravar na pasta do Drive. Mesmo gerador do botão "Baixar .zip" das
 * Configurações, só que lendo do banco com a chave de backup.
 *
 * GET entrega o .zip. POST registra que o script gravou os arquivos (e encerra
 * o pedido feito pelo botão). Só lê dados do dono da chave.
 */
export async function GET(req: NextRequest) {
  const usuario = await donoDaChave(req);
  if (!usuario) return NextResponse.json({ error: "chave inválida" }, { status: 401 });

  const supabase = createServiceClient();
  const [livros, sinapses, config] = await Promise.all([
    supabase.from("books").select("*").eq("user_id", usuario).is("deleted_at", null),
    supabase.from("synapses").select("*").eq("user_id", usuario).is("deleted_at", null),
    supabase.from("settings").select("backup_areas, backup_name").eq("user_id", usuario).maybeSingle(),
  ]);
  const erro = livros.error ?? sinapses.error;
  if (erro) return NextResponse.json({ error: erro.message }, { status: 500 });

  const areas = (config.data?.backup_areas ?? AREAS_PADRAO).filter(ehAreaDeBackup);
  const arquivos = arquivosDoBackup(
    { livros: (livros.data ?? []).map(rowToBook), sinapses: (sinapses.data ?? []).map(rowToSynapse) },
    areas,
    config.data?.backup_name ?? "",
    new Date().toISOString()
  );

  const zip = new JSZip();
  for (const a of arquivos) zip.file(a.nome, a.conteudo);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Cache-Control": "no-store",
      "X-Faro-Arquivos": String(arquivos.length),
    },
  });
}

export async function POST(req: NextRequest) {
  const usuario = await donoDaChave(req);
  if (!usuario) return NextResponse.json({ error: "chave inválida" }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { arquivos?: number } | null;
  const { error } = await createServiceClient()
    .from("backup_status")
    .update({
      aprendizado_enviado_em: new Date().toISOString(),
      aprendizado_arquivos: Number.isFinite(corpo?.arquivos) ? Math.round(corpo!.arquivos!) : null,
      aprendizado_pedido_em: null,
    })
    .eq("user_id", usuario);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
