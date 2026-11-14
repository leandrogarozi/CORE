import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { dataEHoraLocais } from "@/lib/backup/aviso";
import { enviarPushAoUsuario } from "@/lib/push/enviar";
import { duracaoDoSonoMin } from "@/lib/board/sono";
import { textoDaSemana, type DadosDaSemana } from "@/lib/push/resumo-semanal-texto";

const FUSO_PADRAO = "America/Sao_Paulo";
/** No domingo, a partir desta hora, fecha a semana (segunda a domingo) e manda o resumo. */
const HORA_DO_DOMINGO = 19;
/** Na segunda de manhã, se o domingo falhou, ainda manda (a semana fechada é a de ontem). */
const HORA_DA_SEGUNDA_DE = 7;
const HORA_DA_SEGUNDA_ATE = 12;

function somaDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}
const diaDaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/**
 * "Como foi sua semana": todo domingo à noite (19h no fuso da pessoa), a caixa de Avisos e o push trazem o fechamento
 * da semana (segunda a domingo) comparado com a anterior: tarefas, cronômetro, estudo, hábitos que subiram e caíram,
 * humor e sono. Só os hábitos (não os blocos do dia a dia). Marca antes de enviar (pessoa + segunda da semana), então
 * nunca repete. Quem desligou "Resumo da semana" em Configurações não recebe.
 */
export async function enviarResumoDaSemana(supabase: SupabaseClient<Database>, nowMs: number): Promise<{ avisados: number; erros: string[] }> {
  const out = { avisados: 0, erros: [] as string[] };
  const { data: configs, error } = await supabase.from("settings").select("user_id, timezone, feature_flags");
  if (error) {
    out.erros.push(error.message);
    return out;
  }
  for (const c of configs ?? []) {
    if ((c.feature_flags as Record<string, boolean> | null)?.resumo_semana === false) continue;
    const { data: hoje, hora } = dataEHoraLocais(nowMs, c.timezone || FUSO_PADRAO);
    const dow = diaDaSemana(hoje);
    let fim: string;
    if (dow === 0 && hora >= HORA_DO_DOMINGO) fim = hoje;
    else if (dow === 1 && hora >= HORA_DA_SEGUNDA_DE && hora < HORA_DA_SEGUNDA_ATE) fim = somaDias(hoje, -1);
    else continue;
    const inicio = somaDias(fim, -6);

    // A chave primária é a trava: só uma execução do minuto consegue marcar.
    const { error: erroMarca } = await supabase.from("resumo_semanal_enviado" as never).insert({ user_id: c.user_id, semana: inicio } as never);
    if (erroMarca) {
      if ((erroMarca as { code?: string }).code !== "23505") out.erros.push(`${c.user_id}: ${(erroMarca as { message: string }).message}`);
      continue;
    }

    try {
      const dados = await juntarDados(supabase, c.user_id, inicio, fim);
      const texto = textoDaSemana(dados.atual, dados.anterior);
      if (!texto) continue;
      const { error: erroAviso } = await supabase.from("faro_avisos").insert({ user_id: c.user_id, tipo: "resumo_semana", titulo: texto.titulo, corpo: texto.corpo, destino: "dashboard" });
      if (erroAviso) out.erros.push(`${c.user_id}: aviso na caixa falhou (${erroAviso.message})`);
      await enviarPushAoUsuario(supabase, c.user_id, { title: texto.titulo, body: texto.push, url: "/" }).catch(() => 0);
      out.avisados++;
    } catch (e) {
      out.erros.push(`${c.user_id}: ${e instanceof Error ? e.message : "falha ao montar o resumo"}`);
    }
  }
  return out;
}

async function juntarDados(supabase: SupabaseClient<Database>, userId: string, inicio: string, fim: string): Promise<{ atual: DadosDaSemana; anterior: DadosDaSemana }> {
  const desde = somaDias(inicio, -7);
  const [tarefas, tempos, estudoTarefas, habitos, marcas, diarios] = await Promise.all([
    supabase.from("tasks").select("date").eq("user_id", userId).eq("done", true).is("deleted_at", null).gte("date", desde).lte("date", fim),
    supabase.from("task_time_entries").select("task_id, log_date, seconds").eq("user_id", userId).gte("log_date", desde).lte("log_date", fim),
    supabase.from("tasks").select("id").eq("user_id", userId).not("study_plan_id", "is", null),
    supabase.from("habits").select("id, name").eq("user_id", userId),
    supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", userId).eq("checked", true).gte("log_date", desde).lte("log_date", fim),
    supabase.from("daily_logs").select("log_date, mood, slept_at, woke_at").eq("user_id", userId).gte("log_date", desde).lte("log_date", fim),
  ]);
  for (const r of [tarefas, tempos, estudoTarefas, habitos, marcas, diarios]) if (r.error) throw new Error(r.error.message);

  const estudoIds = new Set((estudoTarefas.data ?? []).map((t) => t.id));
  const nomeDoHabito = new Map((habitos.data ?? []).map((h) => [h.id, h.name]));
  const noAtual = (d: string) => d >= inicio && d <= fim;

  const montar = (ehAtual: boolean): DadosDaSemana => {
    const dentro = (d: string | null) => !!d && (ehAtual ? noAtual(d) : d >= desde && d < inicio);
    const segundos = (tempos.data ?? []).filter((t) => dentro(t.log_date));
    const habitosDaSemana: Record<string, number> = {};
    for (const h of habitos.data ?? []) habitosDaSemana[h.name] = 0;
    for (const m of marcas.data ?? []) {
      const nome = nomeDoHabito.get(m.habit_id);
      if (nome && dentro(m.log_date)) habitosDaSemana[nome] = (habitosDaSemana[nome] ?? 0) + 1;
    }
    const dias = (diarios.data ?? []).filter((d) => dentro(d.log_date));
    return {
      tarefas: (tarefas.data ?? []).filter((t) => dentro(t.date)).length,
      horas: segundos.reduce((a, t) => a + t.seconds, 0) / 3600,
      estudoHoras: segundos.filter((t) => estudoIds.has(t.task_id)).reduce((a, t) => a + t.seconds, 0) / 3600,
      habitos: habitosDaSemana,
      humor: media(dias.map((d) => d.mood).filter((m): m is number => m !== null && m > 0)),
      sonoMin: media(dias.map((d) => duracaoDoSonoMin(d.slept_at, d.woke_at)).filter((m): m is number => m !== null)),
    };
  };
  return { atual: montar(true), anterior: montar(false) };
}
