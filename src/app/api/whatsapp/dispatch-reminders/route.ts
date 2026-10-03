import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rowToReminder } from "@/lib/board/mappers";
import { isReminderAlertingInZone, zonedDateTimeToMs } from "@/lib/board/reminder-alerts";
import { proximaOcorrencia, semLembreteDeTarefaApagada } from "@/lib/board/zap-engine";
import { sendWhatsAppReminderMessage } from "@/lib/whatsapp/send";
import { fmtDayMonth } from "@/lib/date-utils";
import { enviarPushesDosLembretes } from "@/lib/push/dispatch";

export const dynamic = "force-dynamic";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
// Tarifa do template utility no Brasil desde 01/07/2026. Só entra em cena se a
// linha de settings não tiver valor próprio — o normal é ler o que está na tela.
const DEFAULT_MSG_COST_USD = 0.0068;
const DEFAULT_USD_BRL = 5.1;

// Primeiro instante do mês corrente NO FUSO DO USUÁRIO — a fatura da Meta fecha
// por mês, então o teto conta por mês. Passa pelo zonedDateTimeToMs de propósito:
// "dia 1 às 00:00" em São Paulo é 03:00 UTC, e montar isso direto em UTC jogaria
// as três primeiras horas de todo dia 1º pro mês anterior.
function monthStartISO(timeZone: string): string {
  const anoMes = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return new Date(zonedDateTimeToMs(`${anoMes}-01`, "00:00", timeZone)).toISOString();
}

/** O "hoje" do usuário, não o do servidor: a Vercel roda em UTC, e entre 21h e
 *  meia-noite de Brasília o dia lá já virou. */
function hojeNaZona(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );
}

function reminderMessageText(title: string, date: string | null, time: string | null): string {
  const when = date ? `${fmtDayMonth(date)}${time ? ` às ${time}` : ""}` : time ? `às ${time}` : null;
  return when ? `${title} — ${when}` : title;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // O push de celular roda primeiro e sozinho: é grátis, vale pra todo lembrete
  // com data e hora, e uma falha do WhatsApp (teto, template, Meta fora do ar)
  // não pode calar o outro canal — nem o contrário.
  let push: Awaited<ReturnType<typeof enviarPushesDosLembretes>>;
  try {
    push = await enviarPushesDosLembretes(createServiceClient(), Date.now());
  } catch (e) {
    push = { candidatos: 0, avisados: 0, semAparelho: 0, erros: [e instanceof Error ? e.message : "falha no push"] };
  }
  const resposta = await dispararWhatsApp();
  const corpo = await resposta.json();
  return NextResponse.json({ ...corpo, push }, { status: resposta.status });
}

async function dispararWhatsApp(): Promise<NextResponse> {

  const supabase = createServiceClient();
  const nowMs = Date.now();

  const { data: rows, error } = await supabase
    .from("reminders")
    .select("*")
    .is("deleted_at", null)
    .eq("done", false)
    .not("alert_minutes_before", "is", null)
    // O ícone do zap do lembrete, e só ele. Antes isso aceitava `whatsapp is
    // null` também, por um raciocínio errado meu de que lembrete antigo "sempre
    // avisou" — não avisava, porque sem aviso marcado nunca houve disparo. Agora
    // a regra é a dele: só sai o que ele acendeu.
    .eq("whatsapp", true)
    .is("whatsapp_notified_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let dueRows = rows ?? [];

  // Segunda trava: lembrete de tarefa/reunião que foi pra lixeira não avisa.
  //
  // Quem leva o lembrete junto é o `deleteTask`, na tela. Esta checagem existe
  // porque o motor não pode depender disso ter dado certo: lembrete salvo antes
  // dessa correção, aba fechada no meio do delete, escrita que falhou — em
  // qualquer um desses casos sobra um lembrete vivo apontando pra uma tarefa
  // apagada, e a mensagem sai sem que ninguém tenha pedido. Mandar mensagem
  // demais é o pior defeito que este motor pode ter.
  const taskIds = [...new Set(dueRows.map((r) => r.task_id).filter(Boolean))] as string[];
  if (taskIds.length) {
    const { data: apagadas, error: erroTarefas } = await supabase
      .from("tasks")
      .select("id")
      .in("id", taskIds)
      .not("deleted_at", "is", null);
    // Falha aqui não deixa passar: sem saber quais tarefas foram apagadas, o
    // motor se cala em vez de arriscar mandar o que não devia.
    if (erroTarefas) return NextResponse.json({ error: erroTarefas.message }, { status: 500 });
    const naLixeira = new Set((apagadas ?? []).map((t) => t.id));
    dueRows = semLembreteDeTarefaApagada(dueRows, naLixeira);
  }

  // Os lembretes que o zap criou — são os candidatos a virar a página do dia,
  // tenham sido avisados ou NÃO. Os avisados precisam de uma data nova porque o
  // motor marca whatsapp_notified_at e nunca mais olha pra eles. Os não avisados
  // entram pelo mesmo motivo, só que mais traiçoeiro: se o aviso de hoje não
  // saiu (motor fora do ar, teto de gasto, janela perdida), o lembrete ficava
  // preso na data de hoje pra sempre e o dia seguinte também não avisava.
  // Foi o que aconteceu com a rosuvastatina em 02/10.
  const { data: paraVirar } = await supabase
    .from("reminders")
    .select("*")
    .not("source_kind", "is", null)
    .is("deleted_at", null)
    .eq("done", false);
  const viradaRows = paraVirar ?? [];

  const userIdById = new Map(dueRows.map((row) => [row.id, row.user_id]));
  const userIds = [...new Set([...dueRows, ...viradaRows].map((row) => row.user_id))];
  if (userIds.length === 0) return NextResponse.json({ checked: 0, due: 0, notified: 0, avancados: 0 });

  // As configurações vêm ANTES do filtro porque o fuso do usuário faz parte da
  // conta: aqui no servidor (UTC) "10:00" sem fuso viraria 07:00 de Brasília.
  const { data: settingsRows, error: settingsError } = await supabase
    .from("settings")
    .select("user_id, notify_phone, timezone, whatsapp_msg_cost_usd, whatsapp_monthly_cap_brl, whatsapp_usd_brl")
    .in("user_id", userIds);
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const phoneByUser = new Map((settingsRows ?? []).map((s) => [s.user_id, s.notify_phone]));
  const tzByUser = new Map((settingsRows ?? []).map((s) => [s.user_id, s.timezone || DEFAULT_TIME_ZONE]));
  const costByUser = new Map(
    (settingsRows ?? []).map((s) => [s.user_id, Number(s.whatsapp_msg_cost_usd ?? DEFAULT_MSG_COST_USD)])
  );
  // O teto é em reais, então o câmbio faz parte da conta da trava (não é só
  // enfeite de tela): a tarifa da Meta vem em dólar e o limite do Leandro é em
  // real.
  const capBrlByUser = new Map(
    (settingsRows ?? []).map((s) => [
      s.user_id,
      s.whatsapp_monthly_cap_brl === null ? null : Number(s.whatsapp_monthly_cap_brl),
    ])
  );
  const fxByUser = new Map(
    (settingsRows ?? []).map((s) => [s.user_id, Number(s.whatsapp_usd_brl ?? DEFAULT_USD_BRL)])
  );

  // --- vira a página do dia dos lembretes criados pelo ícone do zap ---
  //
  // Um lembrete recorrente dispararia UMA VEZ SÓ: o motor marca
  // whatsapp_notified_at e nunca mais olha pra ele. Alguém precisa avançar a
  // data pra próxima ocorrência, e é aqui.
  //
  // O filtro `source_kind is not null` é deliberado: só os lembretes que o
  // próprio FARO criou a partir de um remédio (ou, no futuro, de uma manutenção
  // ou evento) são mexidos. Os que o Leandro escreveu à mão ficam exatamente
  // como ele deixou — nenhuma rotina automática reescreve a data deles.
  let avancados = 0;
  for (const row of viradaRows) {
    const r = rowToReminder(row);
    const tz = tzByUser.get(row.user_id) ?? DEFAULT_TIME_ZONE;
    const alvoMs = r.date ? zonedDateTimeToMs(r.date, r.time ?? "23:59", tz) : NaN;
    // Só vira depois que a hora marcada passou — antes disso ainda é o de hoje.
    if (!Number.isFinite(alvoMs) || nowMs <= alvoMs) continue;
    const proxima = proximaOcorrencia(r, hojeNaZona(tz));
    if (!proxima) continue;
    const { error: erroAvanco } = await supabase
      .from("reminders")
      .update({ remind_date: proxima, whatsapp_notified_at: null })
      .eq("id", r.id);
    if (!erroAvanco) avancados++;
  }

  const due = dueRows
    .map(rowToReminder)
    .filter((r) => isReminderAlertingInZone(r, nowMs, tzByUser.get(userIdById.get(r.id)!) ?? DEFAULT_TIME_ZONE));
  if (due.length === 0) return NextResponse.json({ checked: dueRows.length, due: 0, notified: 0, avancados });

  // Quantas mensagens cada usuário já mandou no mês — é o que a trava de gasto
  // consulta. Conta só envio que deu certo: mensagem que falhou não é cobrada.
  // Fica DEPOIS do filtro de propósito: o cron roda de minuto em minuto, e
  // contar aqui só quando existe mensagem pra sair evita 1.440 consultas por dia
  // pra não usar o resultado.
  const enviadasNoMes = new Map<string, number>();
  for (const uid of new Set(due.map((r) => userIdById.get(r.id)!))) {
    const { count } = await supabase
      .from("whatsapp_sends")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("ok", true)
      .gte("sent_at", monthStartISO(tzByUser.get(uid) ?? DEFAULT_TIME_ZONE));
    enviadasNoMes.set(uid, count ?? 0);
  }

  let notified = 0;
  let blocked = 0;
  const errors: string[] = [];

  for (const reminder of due) {
    const userId = userIdById.get(reminder.id)!;
    const phone = phoneByUser.get(userId);
    if (!phone) continue;

    // Trava de gasto ANTES de reservar o lembrete: se estourou o teto do mês, a
    // mensagem não sai e o lembrete continua não-notificado. Não vira enxurrada
    // depois porque a janela de alerta é fechada (só vale até a hora marcada) —
    // um lembrete barrado hoje simplesmente não é avisado, em vez de ficar
    // guardado pra disparar todo de uma vez quando o teto subir.
    const capBrl = capBrlByUser.get(userId) ?? null;
    const custoMsgBrl =
      (costByUser.get(userId) ?? DEFAULT_MSG_COST_USD) * (fxByUser.get(userId) ?? DEFAULT_USD_BRL);
    const jaEnviadas = enviadasNoMes.get(userId) ?? 0;
    if (capBrl !== null && (jaEnviadas + 1) * custoMsgBrl > capBrl) {
      blocked++;
      errors.push(
        `${reminder.id}: teto mensal de R$ ${capBrl.toFixed(2)} atingido — mensagem não enviada`
      );
      continue;
    }

    // Marca ANTES de enviar, e só segue se esta execução foi quem marcou (o
    // `.is(null)` + `.select()` garantem isso). O cron roda de minuto em minuto:
    // se a marcação viesse depois do envio, qualquer falha em gravá-la faria a
    // mesma mensagem sair de novo no minuto seguinte, e de novo, pra sempre.
    // Assim, no pior caso um lembrete deixa de ser avisado — nunca o contrário.
    const { data: claimed, error: claimError } = await supabase
      .from("reminders")
      .update({ whatsapp_notified_at: new Date().toISOString() })
      .eq("id", reminder.id)
      .is("whatsapp_notified_at", null)
      .select("id");
    if (claimError) {
      errors.push(`${reminder.id}: falha ao marcar como notificado (${claimError.message})`);
      continue;
    }
    if (!claimed || claimed.length === 0) continue; // outra execução já pegou

    const text = reminderMessageText(reminder.title, reminder.date, reminder.time);
    const result = await sendWhatsAppReminderMessage(phone, text);

    // Toda tentativa entra no livro-caixa, dando certo ou não: o que deu certo
    // é o que a Meta cobra, e o que falhou é o que explica o silêncio depois.
    const { error: ledgerError } = await supabase.from("whatsapp_sends").insert({
      user_id: userId,
      reminder_id: reminder.id,
      kind: "lembrete",
      template: "lembrete_faro",
      ok: result.ok,
      error: result.ok ? null : result.error,
      // Só existem quando a Meta aceitou. São o que permite investigar uma
      // mensagem aceita que mesmo assim não chegou.
      message_id: result.ok ? result.messageId : null,
      wa_id: result.ok ? result.waId : null,
    });
    if (ledgerError) errors.push(`${reminder.id}: falha ao registrar o envio (${ledgerError.message})`);

    if (result.ok) {
      notified++;
      enviadasNoMes.set(userId, (enviadasNoMes.get(userId) ?? 0) + 1);
    } else {
      errors.push(`${reminder.id}: ${result.error}`);
    }
  }

  return NextResponse.json({ checked: dueRows.length, due: due.length, notified, blocked, avancados, errors });
}
