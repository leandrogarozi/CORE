import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rowToReminder } from "@/lib/board/mappers";
import { isReminderAlerting } from "@/lib/board/reminder-alerts";
import { sendWhatsAppReminderMessage } from "@/lib/whatsapp/send";
import { fmtDayMonth } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

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
  const due = dueRows.map(rowToReminder).filter((r) => isReminderAlerting(r, nowMs));
  if (due.length === 0) return NextResponse.json({ checked: dueRows.length, notified: 0 });

  const userIds = [...new Set(due.map((r) => userIdById.get(r.id)!))];
  const { data: settingsRows, error: settingsError } = await supabase
    .from("settings")
    .select("user_id, notify_phone")
    .in("user_id", userIds);
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const phoneByUser = new Map((settingsRows ?? []).map((s) => [s.user_id, s.notify_phone]));

  let notified = 0;
  const errors: string[] = [];

  for (const reminder of due) {
    const userId = userIdById.get(reminder.id)!;
    const phone = phoneByUser.get(userId);
    if (!phone) continue;

    const text = reminderMessageText(reminder.title, reminder.date, reminder.time);
    const result = await sendWhatsAppReminderMessage(phone, text);
    if (result.ok) {
      notified++;
    } else {
      errors.push(`${reminder.id}: ${result.error}`);
    }
    // Marca como notificado mesmo se falhar, pra não ficar tentando pra sempre
    // num número inválido/template rejeitado — erro real fica no log do cron.
    await supabase.from("reminders").update({ whatsapp_notified_at: new Date().toISOString() }).eq("id", reminder.id);
  }

  return NextResponse.json({ checked: dueRows.length, due: due.length, notified, errors });
}
