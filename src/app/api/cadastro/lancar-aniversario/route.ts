import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { levarAniversarioParaOFaro } from "@/lib/cadastro/sincronizar";

export const dynamic = "force-dynamic";

const hojeNoBrasil = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/**
 * "Jogar para Aniversários": lança o aniversário de um cliente do site em Aniversários, aguardando
 * confirmação, e avisa "novo aniversariante". Só acontece quando o Leandro aperta o botão na ficha do
 * cliente (o cadastro não lança sozinho). Só o dono, logado.
 *   POST /api/cadastro/lancar-aniversario   JSON: { id }   (id do cliente em clientes_cadastro)
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, erro: "Não autenticado." }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id : "";
  if (!id) return NextResponse.json({ ok: false, erro: "Informe o cliente." }, { status: 400 });

  const { data: c, error } = await supabase.from("clientes_cadastro").select("*").eq("user_id", user.id).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  if (!c) return NextResponse.json({ ok: false, erro: "Cliente não encontrado." }, { status: 404 });
  if (!c.aniversario) return NextResponse.json({ ok: false, erro: "Este cliente não informou a data de nascimento." }, { status: 400 });

  if (c.birthday_id) {
    const { data: vivo } = await supabase.from("birthdays").select("id").eq("id", c.birthday_id).is("deleted_at", null).maybeSingle();
    if (vivo) return NextResponse.json({ ok: true, jaEstava: true });
  }

  try {
    const r = await levarAniversarioParaOFaro(
      supabase,
      { usuario: user.id, nome: c.nome, whatsapp: c.whatsapp, aniversario: c.aniversario, produto: c.produto },
      hojeNoBrasil()
    );
    if (r.birthdayId) await supabase.from("clientes_cadastro").update({ birthday_id: r.birthdayId }).eq("id", c.id);
    if (r.criou) {
      // É aqui que nasce o aviso de "novo aniversariante" (o cadastro em si já avisou "novo cadastro").
      const data = c.aniversario.split("-").reverse().slice(0, 2).join("/");
      await supabase.from("faro_avisos").insert({
        user_id: user.id,
        tipo: "aniversario",
        titulo: `Novo aniversariante: ${c.nome}`,
        corpo: `O aniversário de ${c.nome} (${data}) entrou em Aniversários e espera a sua confirmação. Confira, ligue a mensagem e aperte “Confirmar cliente”. Há uma tarefa para isso em Lembretes.`,
        destino: "aniversarios",
      });
    }
    return NextResponse.json({ ok: true, criou: r.criou, jaNaLista: !r.criou });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : "Não foi possível lançar agora." }, { status: 500 });
  }
}
