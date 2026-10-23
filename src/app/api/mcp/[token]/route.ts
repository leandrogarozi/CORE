import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rowToKnowledgeItem, rowToSynapse } from "@/lib/board/mappers";
import { hojeNoBrasil, responderMensagem, type AcervoDoFaro } from "@/lib/conector/faro-mcp";
import { executarEscrita, type Repositorio } from "@/lib/conector/faro-escrita";
import { enviarPushAoUsuario } from "@/lib/push/enviar";
import {
  birthdayToInsertRow,
  reminderToInsertRow,
  taskToInsertRow,
} from "@/lib/board/mappers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Conector FARO (servidor MCP remoto): lê o acervo e cria aniversários, tarefas e
 * lembretes, sempre depois da confirmação do Leandro (ver faro-escrita.ts).
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
    supabase.from("books").select("id, title, status, insights, created_at").eq("user_id", usuario).eq("kind", "livro"),
    supabase.from("synapses").select("*").eq("user_id", usuario).is("deleted_at", null),
    supabase
      .from("knowledge_items")
      .select("*")
      .eq("user_id", usuario)
      .eq("status", "aprovado")
      .is("deleted_at", null),
    supabase.from("settings").select("backup_name, preferred_name, faro_resumo").eq("user_id", usuario).maybeSingle(),
  ]);
  const erro = livros.error ?? sinapses.error ?? conhecimento.error;
  if (erro) throw new Error(erro.message);
  return {
    nome: config.data?.preferred_name?.trim() || config.data?.backup_name?.trim() || "o usuário",
    resumo: config.data?.faro_resumo?.trim() || "",
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

function repositorioDe(usuario: string): Repositorio {
  const supabase = createServiceClient();
  const falhou = (onde: string, e: { message: string } | null) => {
    if (e) throw new Error(`${onde}: ${e.message}`);
  };
  return {
    async aniversariosExistentes() {
      const { data, error } = await supabase
        .from("birthdays")
        .select("name, month, day")
        .eq("user_id", usuario)
        .is("deleted_at", null);
      falhou("ler aniversários", error);
      return data ?? [];
    },
    async inserirAniversario(b, lembrete) {
      const { error } = await supabase.from("birthdays").insert(birthdayToInsertRow(b, usuario));
      falhou("gravar aniversário", error);
      if (lembrete) {
        const { error: e2 } = await supabase.from("reminders").insert(reminderToInsertRow(lembrete, usuario));
        falhou("gravar lembrete do aniversário", e2);
      }
    },
    async statusDasTarefas() {
      const { data, error } = await supabase
        .from("task_statuses")
        .select("id, is_done, is_scheduled, sort_order")
        .eq("user_id", usuario)
        .order("sort_order");
      falhou("ler status das tarefas", error);
      const todos = data ?? [];
      const trabalho = todos.filter((s) => !s.is_done && !s.is_scheduled);
      return {
        padrao: trabalho[0]?.id ?? todos.find((s) => !s.is_done)?.id ?? todos[0]?.id ?? null,
        agendado: todos.find((s) => s.is_scheduled)?.id ?? null,
      };
    },
    async proximaOrdem(data) {
      let q = supabase.from("tasks").select("sort_order").eq("user_id", usuario).is("deleted_at", null);
      q = data ? q.eq("date", data) : q.is("date", null);
      const { data: linhas, error } = await q.order("sort_order", { ascending: false }).limit(1);
      falhou("ler ordem das tarefas", error);
      return linhas?.length ? (linhas[0].sort_order ?? 0) + 1 : 0;
    },
    async inserirTarefa(t) {
      const { error } = await supabase.from("tasks").insert(taskToInsertRow(t, usuario));
      falhou("gravar tarefa", error);
    },
    async agendaDoPeriodo(desde, ate) {
      const colunas = "id, title, date, time, client, note, done, category, category2";
      const [dentro, atrasadas, lembretes] = await Promise.all([
        supabase.from("tasks").select(colunas).eq("user_id", usuario).is("deleted_at", null).eq("done", false).gte("date", desde).lte("date", ate).order("date").order("time"),
        supabase.from("tasks").select(colunas).eq("user_id", usuario).is("deleted_at", null).eq("done", false).lt("date", desde).order("date", { ascending: false }).limit(30),
        supabase.from("reminders").select("title, remind_date, remind_time, source_kind").eq("user_id", usuario).is("deleted_at", null).eq("done", false).gte("remind_date", desde).lte("remind_date", ate).order("remind_date"),
      ]);
      falhou("ler agenda", dentro.error ?? atrasadas.error ?? lembretes.error);
      const paraTarefa = (t: NonNullable<typeof dentro.data>[number]) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        time: t.time,
        client: t.client,
        note: t.note ?? "",
        done: t.done,
        category: t.category,
        category2: t.category2,
      });
      return {
        tarefas: (dentro.data ?? []).map(paraTarefa),
        atrasadas: (atrasadas.data ?? []).map(paraTarefa),
        // Remédio e refeição da dieta são saúde: nunca saem daqui.
        lembretes: (lembretes.data ?? [])
          .filter((r) => r.source_kind !== "medication" && r.source_kind !== "diet_meal")
          .map((r) => ({ title: r.title, date: r.remind_date, time: r.remind_time })),
      };
    },
    async tarefasPorIds(ids) {
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, date, time, client, note, done, category, category2")
        .eq("user_id", usuario)
        .is("deleted_at", null)
        .in("id", ids);
      falhou("ler tarefas", error);
      return (data ?? []).map((t) => ({ ...t, note: t.note ?? "" }));
    },
    async statusConcluido() {
      const { data, error } = await supabase.from("task_statuses").select("id").eq("user_id", usuario).eq("is_done", true).order("sort_order").limit(1);
      falhou("ler status concluído", error);
      return data?.[0]?.id ?? null;
    },
    async concluirTarefas(ids, statusId) {
      const { error } = await supabase
        .from("tasks")
        .update({ done: true, ...(statusId ? { status_id: statusId } : {}) })
        .eq("user_id", usuario)
        .in("id", ids);
      falhou("concluir tarefas", error);
    },
    async anexarNota(id, notaNova) {
      const { error } = await supabase.from("tasks").update({ note: notaNova }).eq("user_id", usuario).eq("id", id);
      falhou("anotar na tarefa", error);
    },
    async conhecimentoExistente() {
      const { data, error } = await supabase
        .from("knowledge_items")
        .select("tipo, titulo")
        .eq("user_id", usuario)
        .is("deleted_at", null)
        .neq("status", "descartado");
      falhou("ler conhecimento", error);
      return data ?? [];
    },
    async inserirConhecimento(itens) {
      const lote = new Date().toISOString();
      const { error } = await supabase.from("knowledge_items").insert(
        itens.map((k) => ({
          id: k.id,
          user_id: usuario,
          tipo: k.tipo,
          titulo: k.titulo,
          conteudo: k.conteudo,
          data_ref: k.dataRef,
          origem: k.origem,
          tags: k.tags,
          status: "pendente",
          fonte: "conector",
          lote,
        }))
      );
      falhou("gravar proposta", error);
    },
    async inserirLembrete(r) {
      const { error } = await supabase.from("reminders").insert(reminderToInsertRow(r, usuario));
      falhou("gravar lembrete", error);
    },
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
  const repo = repositorioDe(usuario);
  const escrever = async (nome: string, args: Record<string, unknown>) => {
    usouFerramenta = true;
    const r = await executarEscrita(nome, args, repo, { hoje: hojeNoBrasil(agora), novoId: () => crypto.randomUUID() });
    // Tudo que a IA grava no FARO avisa o Leandro. Falha no aviso nunca desfaz nem esconde a gravação.
    if (r.aviso) {
      // A caixa de avisos do app (sininho da home): fica até ele ler, mesmo que o push se perca.
      const { error: erroAviso } = await createServiceClient().from("faro_avisos").insert({
        user_id: usuario,
        tipo: "ia",
        titulo: r.aviso.titulo,
        corpo: r.aviso.corpo,
        destino: r.aviso.destino,
      });
      if (erroAviso) console.error("conector: não gravei o aviso na caixa", erroAviso.message);
      await enviarPushAoUsuario(createServiceClient(), usuario, { title: r.aviso.titulo, body: r.aviso.corpo.slice(0, 140) }).catch((e) => {
        console.error("conector: aviso por push falhou", e instanceof Error ? e.message : e);
        return 0;
      });
    }
    return r;
  };
  const respostas = (await Promise.all(lote.map((m) => responderMensagem(m, carregar, agora, "1.1.0", escrever)))).filter(
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
