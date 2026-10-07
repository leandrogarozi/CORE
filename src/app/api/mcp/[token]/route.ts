import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rowToKnowledgeItem, rowToSynapse } from "@/lib/board/mappers";
import { responderMensagem, type AcervoDoFaro } from "@/lib/conector/faro-mcp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Conector FARO (servidor MCP remoto, só leitura).
 *
 * O endereço carrega a chave: /api/mcp/faro_mcp_... É assim porque o "conector
 * personalizado" do Claude aceita um endereço sem login; a chave no caminho é o
 * que separa o acervo do Leandro do resto da internet. Gerar uma chave nova nas
 * Configurações invalida o endereço antigo na hora.
 *
 * Só POST (JSON-RPC). GET responde 405: não abrimos fluxo de eventos, o que o
 * protocolo permite.
 */
type Contexto = { params: Promise<{ token: string }> };

async function donoDoConector(token: string): Promise<string | null> {
  if (!token.startsWith("faro_mcp_") || token.length < 40) return null;
  const { data } = await createServiceClient()
    .from("backup_status")
    .select("user_id")
    .eq("conector_token", token)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function carregarAcervo(usuario: string): Promise<AcervoDoFaro> {
  const supabase = createServiceClient();
  const [livros, sinapses, conhecimento, config] = await Promise.all([
    supabase.from("books").select("id, title, status, insights, created_at").eq("user_id", usuario),
    supabase.from("synapses").select("*").eq("user_id", usuario).is("deleted_at", null),
    supabase
      .from("knowledge_items")
      .select("*")
      .eq("user_id", usuario)
      .eq("status", "aprovado")
      .is("deleted_at", null),
    supabase.from("settings").select("backup_name").eq("user_id", usuario).maybeSingle(),
  ]);
  const erro = livros.error ?? sinapses.error ?? conhecimento.error;
  if (erro) throw new Error(erro.message);
  return {
    nome: config.data?.backup_name?.trim() || "Leandro",
    livros: (livros.data ?? []).map((l) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      insights: l.insights,
      createdAt: l.created_at,
    })),
    sinapses: (sinapses.data ?? []).map(rowToSynapse),
    conhecimento: (conhecimento.data ?? []).map(rowToKnowledgeItem),
  };
}

async function registrarUso(usuario: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("backup_status").select("conector_chamadas").eq("user_id", usuario).maybeSingle();
  await supabase
    .from("backup_status")
    .update({ conector_usado_em: new Date().toISOString(), conector_chamadas: (data?.conector_chamadas ?? 0) + 1 })
    .eq("user_id", usuario);
}

export async function POST(req: NextRequest, { params }: Contexto) {
  const { token } = await params;
  const usuario = await donoDoConector(token);
  if (!usuario) return NextResponse.json({ error: "conector inválido" }, { status: 401 });

  const corpo = await req.json().catch(() => undefined);
  if (corpo === undefined) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, { status: 400 });
  }

  let acervo: Promise<AcervoDoFaro> | null = null;
  let usouFerramenta = false;
  const carregar = () => {
    usouFerramenta = true;
    return (acervo ??= carregarAcervo(usuario));
  };
  const agora = new Date();
  const lote = Array.isArray(corpo) ? corpo : [corpo];
  const respostas = (await Promise.all(lote.map((m) => responderMensagem(m, carregar, agora, "1.0.0")))).filter(
    (r): r is object => r !== null
  );
  if (usouFerramenta) await registrarUso(usuario).catch(() => {});

  if (!respostas.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(corpo) ? respostas : respostas[0], {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  return new NextResponse("Este conector só aceita POST.", { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  // Encerrar sessão: não guardamos sessão, então não há o que encerrar.
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
