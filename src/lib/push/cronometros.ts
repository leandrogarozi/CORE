import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { minutosPrevistos, perguntaVenceEm, pushDevidoDoCronometro } from "@/lib/board/timer-pergunta";
import { enviarPushAoUsuario } from "./enviar";

export type ResultadoPushCronometros = { candidatos: number; avisados: number; erros: string[] };

/**
 * "Você ainda está aí?" no celular: cronômetro rodando que passou do tempo previsto (ou de 30 min
 * sem confirmação) ganha um push; sem resposta, repete a cada 30 min, no máximo 3 vezes.
 * Marca (`perguntado_para`) ANTES de enviar e só segue quem conseguiu marcar: o pior defeito
 * possível é avisar de novo a cada minuto.
 */
export async function enviarPushesDosCronometros(supabase: SupabaseClient<Database>, nowMs: number): Promise<ResultadoPushCronometros> {
  const out: ResultadoPushCronometros = { candidatos: 0, avisados: 0, erros: [] };
  const { data: timers, error } = await supabase.from("active_timer").select("*");
  if (error) {
    out.erros.push(error.message);
    return out;
  }
  if (!timers?.length) return out;

  const ids = (kind: string) => timers.filter((t) => t.kind === kind).map((t) => t.item_id);
  const [tarefas, habitos, blocos] = await Promise.all([
    supabase.from("tasks").select("id, title, expected_duration_min, duration_minutes, date, time, end_date, end_time").in("id", ids("task")),
    supabase.from("habits").select("id, name, duration_minutes").in("id", ids("habit")),
    supabase.from("fixed_blocks").select("id, name, duration_minutes").in("id", ids("block")),
  ]);
  const nomes = new Map<string, { nome: string; previsto: number | null }>();
  for (const t of tarefas.data ?? []) {
    nomes.set(t.id, {
      nome: t.title,
      previsto: minutosPrevistos({
        expectedDurationMin: t.expected_duration_min,
        durationMin: t.duration_minutes,
        date: t.date,
        time: t.time,
        endDate: t.end_date,
        endTime: t.end_time,
      }),
    });
  }
  for (const h of [...(habitos.data ?? []), ...(blocos.data ?? [])]) nomes.set(h.id, { nome: h.name, previsto: h.duration_minutes });

  for (const t of timers) {
    const info = nomes.get(t.item_id);
    if (!info) continue;
    const inicio = new Date(t.started_at).getTime();
    const confirmado = t.confirmado_em ? new Date(t.confirmado_em).getTime() : null;
    const venceEm = perguntaVenceEm(inicio, confirmado, info.previsto);
    const rodada = pushDevidoDoCronometro(venceEm, nowMs);
    if (rodada === null) continue;
    const jaAvisado = t.perguntado_para ? new Date(t.perguntado_para).getTime() : 0;
    if (jaAvisado >= rodada) continue;
    out.candidatos++;

    const marca = new Date(rodada).toISOString();
    const { data: marcou, error: erroMarca } = await supabase
      .from("active_timer")
      .update({ perguntado_para: marca })
      .eq("id", t.id)
      .or(`perguntado_para.is.null,perguntado_para.lt.${marca}`)
      .select("id");
    if (erroMarca) {
      out.erros.push(`${t.id}: falha ao marcar (${erroMarca.message})`);
      continue;
    }
    if (!marcou?.length) continue;

    const minutos = Math.max(1, Math.floor((nowMs - inicio) / 60000));
    const rodando = minutos >= 60 ? `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}` : `${minutos} min`;
    const chegou = await enviarPushAoUsuario(supabase, t.user_id, {
      title: "Você ainda está aí?",
      body: `“${info.nome}” está rodando há ${rodando}. Abra o FARO para continuar ou pausar.`,
      url: "/",
    });
    if (chegou > 0) out.avisados++;
  }
  return out;
}
