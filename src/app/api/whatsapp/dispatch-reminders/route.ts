import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rowToReminder } from "@/lib/board/mappers";
import { isReminderAlertingInZone, zonedDateTimeToMs } from "@/lib/board/reminder-alerts";
import { sendWhatsAppReminderMessage } from "@/lib/whatsapp/send";
import { fmtDayMonth } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_MSG_COST_USD = 0.008;

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

  const supabase = createServiceClient();
  const nowMs = Date.now();

  const { data: rows, error } = await supabase
    .from("reminders")
    .select("*")
    .is("deleted_at", null)
    .eq("done", false)
    .not("alert_minutes_before", "is", null)
    .is("whatsapp_notified_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const dueRows = rows ?? [];

  const userIdById = new Map(dueRows.map((row) => [row.id, row.user_id]));
  const userIds = [...new Set(dueRows.map((row) => row.user_id))];
  if (userIds.length === 0) return NextResponse.json({ checked: 0, due: 0, notified: 0 });

  // As configurações vêm ANTES do filtro porque o fuso do usuário faz parte da
  // conta: aqui no servidor (UTC) "10:00" sem fuso viraria 07:00 de Brasília.
  const { data: settingsRows, error: settingsError } = await supabase
    .from("settings")
    .select("user_id, notify_phone, timezone, whatsapp_msg_cost_usd, whatsapp_monthly_cap_usd")
    .in("user_id", userIds);
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const phoneByUser = new Map((settingsRows ?? []).map((s) => [s.user_id, s.notify_phone]));
  const tzByUser = new Map((settingsRows ?? []).map((s) => [s.user_id, s.timezone || DEFAULT_TIME_ZONE]));
  const costByUser = new Map(
    (settingsRows ?? []).map((s) => [s.user_id, Number(s.whatsapp_msg_cost_usd ?? DEFAULT_MSG_COST_USD)])
  );
  const capByUser = new Map(
    (settingsRows ?? []).map((s) => [
      s.user_id,
      s.whatsapp_monthly_cap_usd === null ? null : Number(s.whatsapp_monthly_cap_usd),
    ])
  );

  const due = dueRows
    .map(rowToReminder)
    .filter((r) => isReminderAlertingInZone(r, nowMs, tzByUser.get(userIdById.get(r.id)!) ?? DEFAULT_TIME_ZONE));
  if (due.length === 0) return NextResponse.json({ checked: dueRows.length, due: 0, notified: 0 });

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
    const cap = capByUser.get(userId) ?? null;
    const custoMsg = costByUser.get(userId) ?? DEFAULT_MSG_COST_USD;
    const jaEnviadas = enviadasNoMes.get(userId) ?? 0;
    if (cap !== null && (jaEnviadas + 1) * custoMsg > cap) {
      blocked++;
      errors.push(`${reminder.id}: teto mensal de US$ ${cap.toFixed(2)} atingido — mensagem não enviada`);
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
    });
    if (ledgerError) errors.push(`${reminder.id}: falha ao registrar o envio (${ledgerError.message})`);

    if (result.ok) {
      notified++;
      enviadasNoMes.set(userId, (enviadasNoMes.get(userId) ?? 0) + 1);
    } else {
      errors.push(`${reminder.id}: ${result.error}`);
    }
  }

  return NextResponse.json({ checked: dueRows.length, due: due.length, notified, blocked, errors });
}
