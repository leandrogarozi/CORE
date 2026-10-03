import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { enviarPushAoUsuario } from "@/lib/push/enviar";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
/** A partir desta hora (do usuário) sem backup do dia, o FARO avisa. */
export const HORA_DO_AVISO = 18;

/** Data e hora locais ("2026-10-03", 18) no fuso do usuário. */
export function dataEHoraLocais(nowMs: number, timeZone: string): { data: string; hora: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return { data: `${v("year")}-${v("month")}-${v("day")}`, hora: Number(v("hour")) };
}

/** O dia em que o backup foi feito, no fuso do usuário. */
export function diaLocal(iso: string, timeZone: string): string {
  return dataEHoraLocais(Date.parse(iso), timeZone).data;
}

/**
 * Quem ligou o backup automático e ainda não tem backup do DIA recebe um push
 * às 18h: o computador ficou desligado, ou o script falhou. Um aviso por dia
 * (marca antes de enviar), até o backup voltar. Quem nunca ligou não recebe
 * nada: sem `token` não há backup configurado.
 */
export async function avisarBackupAtrasado(
  supabase: SupabaseClient<Database>,
  nowMs: number
): Promise<{ avisados: number }> {
  const { data: linhas } = await supabase
    .from("backup_status")
    .select("user_id, ultimo_backup_em, ultimo_aviso_em")
    .not("token", "is", null);
  if (!linhas?.length) return { avisados: 0 };

  const { data: configs } = await supabase
    .from("settings")
    .select("user_id, timezone")
    .in("user_id", linhas.map((l) => l.user_id));
  const tz = new Map((configs ?? []).map((c) => [c.user_id, c.timezone || DEFAULT_TIME_ZONE]));

  let avisados = 0;
  for (const l of linhas) {
    const zona = tz.get(l.user_id) ?? DEFAULT_TIME_ZONE;
    const { data: hoje, hora } = dataEHoraLocais(nowMs, zona);
    if (hora < HORA_DO_AVISO) continue;
    if (l.ultimo_aviso_em === hoje) continue;
    if (l.ultimo_backup_em && diaLocal(l.ultimo_backup_em, zona) >= hoje) continue;

    // Marca antes de enviar: só uma execução do minuto vence.
    const { data: marcou } = await supabase
      .from("backup_status")
      .update({ ultimo_aviso_em: hoje })
      .eq("user_id", l.user_id)
      .or(`ultimo_aviso_em.is.null,ultimo_aviso_em.neq.${hoje}`)
      .select("user_id");
    if (!marcou?.length) continue;

    const ultimo = l.ultimo_backup_em ? diaLocal(l.ultimo_backup_em, zona).split("-").reverse().slice(0, 2).join("/") : null;
    const chegou = await enviarPushAoUsuario(supabase, l.user_id, {
      title: "O backup do FARO não foi feito hoje",
      body: ultimo
        ? `O último foi em ${ultimo}. Ligue o computador ou abra Configurações > Backup.`
        : "Ligue o computador ou abra Configurações > Backup.",
      url: "/",
    });
    if (chegou > 0) avisados++;
  }
  return { avisados };
}
