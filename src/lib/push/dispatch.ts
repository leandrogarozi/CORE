import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { rowToReminder } from "@/lib/board/mappers";
import { pushDevido } from "@/lib/board/reminder-alerts";
import { semLembreteDeTarefaApagada } from "@/lib/board/zap-engine";
import { fmtDayMonth } from "@/lib/date-utils";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export type ResultadoPush = { candidatos: number; avisados: number; semAparelho: number; erros: string[] };

/**
 * Manda o push de celular dos lembretes que estão na hora.
 *
 * Roda no mesmo agendador do WhatsApp (de minuto em minuto), mas é um canal à
 * parte: marca própria (`push_sent_for`), então um não atrapalha o outro e o
 * lembrete sem zap também avisa. Mesma regra de segurança do motor do WhatsApp:
 * marca ANTES de enviar e só segue quem conseguiu marcar, porque o pior defeito
 * possível aqui é avisar de novo a cada minuto.
 */
export async function enviarPushesDosLembretes(
  supabase: SupabaseClient<Database>,
  nowMs: number
): Promise<ResultadoPush> {
  const out: ResultadoPush = { candidatos: 0, avisados: 0, semAparelho: 0, erros: [] };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    out.erros.push("chaves VAPID não configuradas no servidor");
    return out;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: rows, error } = await supabase
    .from("reminders")
    .select("*")
    .is("deleted_at", null)
    .eq("done", false)
    .not("remind_date", "is", null)
    .not("remind_time", "is", null);
  if (error) {
    out.erros.push(error.message);
    return out;
  }
  let candidatas = rows ?? [];
  if (candidatas.length === 0) return out;

  // Lembrete de tarefa que foi pra lixeira não avisa (mesma trava do WhatsApp).
  const taskIds = [...new Set(candidatas.map((r) => r.task_id).filter(Boolean))] as string[];
  if (taskIds.length) {
    const { data: apagadas, error: erroTarefas } = await supabase
      .from("tasks")
      .select("id")
      .in("id", taskIds)
      .not("deleted_at", "is", null);
    if (erroTarefas) {
      out.erros.push(erroTarefas.message);
      return out;
    }
    candidatas = semLembreteDeTarefaApagada(candidatas, new Set((apagadas ?? []).map((t) => t.id)));
  }

  const userIds = [...new Set(candidatas.map((r) => r.user_id))];
  const { data: settingsRows } = await supabase.from("settings").select("user_id, timezone").in("user_id", userIds);
  const tzByUser = new Map((settingsRows ?? []).map((s) => [s.user_id, s.timezone || DEFAULT_TIME_ZONE]));

  const devidos = candidatas.flatMap((row) => {
    const chave = pushDevido(rowToReminder(row), nowMs, tzByUser.get(row.user_id) ?? DEFAULT_TIME_ZONE);
    return chave && row.push_sent_for !== chave ? [{ row, chave }] : [];
  });
  out.candidatos = devidos.length;
  if (devidos.length === 0) return out;

  const { data: subs, error: erroSubs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", [...new Set(devidos.map((d) => d.row.user_id))]);
  if (erroSubs) {
    out.erros.push(erroSubs.message);
    return out;
  }

  for (const { row, chave } of devidos) {
    const aparelhos = (subs ?? []).filter((s) => s.user_id === row.user_id);
    if (aparelhos.length === 0) {
      out.semAparelho++;
      continue;
    }

    // Marca antes de enviar; `.neq` + `.select()` garantem que só uma execução vence.
    const { data: marcou, error: erroMarca } = await supabase
      .from("reminders")
      .update({ push_sent_for: chave })
      .eq("id", row.id)
      .or(`push_sent_for.is.null,push_sent_for.neq."${chave}"`)
      .select("id");
    if (erroMarca) {
      out.erros.push(`${row.id}: falha ao marcar (${erroMarca.message})`);
      continue;
    }
    if (!marcou || marcou.length === 0) continue;

    const quando = `${row.remind_date ? fmtDayMonth(row.remind_date) : ""}${row.remind_time ? ` às ${row.remind_time}` : ""}`.trim();
    const payload = JSON.stringify({ title: row.title, body: quando, url: "/" });

    const mortos: string[] = [];
    let chegouEmAlgum = false;
    await Promise.all(
      aparelhos.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          chegouEmAlgum = true;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) mortos.push(s.endpoint);
          else out.erros.push(`${row.id}: push recusado (${status ?? "sem código"})`);
        }
      })
    );
    if (mortos.length) {
      await supabase.from("push_subscriptions").delete().eq("user_id", row.user_id).in("endpoint", mortos);
    }
    if (chegouEmAlgum) out.avisados++;
  }
  return out;
}
