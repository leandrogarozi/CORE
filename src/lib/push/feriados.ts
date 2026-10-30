import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { dataEHoraLocais } from "@/lib/backup/aviso";
import { enviarPushAoUsuario } from "@/lib/push/enviar";
import { feriadosEntre } from "@/lib/feriados";

const FUSO_PADRAO = "America/Sao_Paulo";
/** No domingo, a partir desta hora, avisa dos feriados da semana que começa amanhã. */
const HORA_DO_DOMINGO = 18;
/** Na segunda, a partir desta hora, avisa se o domingo não avisou (ex.: conta nova de domingo à noite). */
const HORA_DA_SEGUNDA = 7;

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function somaDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}
const diaDaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const ddmm = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/**
 * "Essa semana tem feriado": uma vez por semana, no domingo à noite (ou na segunda de manhã, se perdeu), a
 * caixa de Avisos e o push mostram os feriados e pontos facultativos nacionais dos próximos 7 dias. Marca antes
 * de enviar (chave: pessoa + segunda-feira da semana), então nunca repete. Quem desligou "Feriados" em
 * Configurações não recebe.
 */
export async function avisarFeriadosDaSemana(supabase: SupabaseClient<Database>, nowMs: number): Promise<{ avisados: number; erros: string[] }> {
  const out = { avisados: 0, erros: [] as string[] };
  const { data: configs, error } = await supabase.from("settings").select("user_id, timezone, feature_flags");
  if (error) {
    out.erros.push(error.message);
    return out;
  }
  for (const c of configs ?? []) {
    if ((c.feature_flags as Record<string, boolean> | null)?.feriados === false) continue;
    const { data: hoje, hora } = dataEHoraLocais(nowMs, c.timezone || FUSO_PADRAO);
    const dow = diaDaSemana(hoje);
    let segunda: string;
    if (dow === 0 && hora >= HORA_DO_DOMINGO) segunda = somaDias(hoje, 1);
    else if (dow === 1 && hora >= HORA_DA_SEGUNDA) segunda = hoje;
    else continue;

    const feriados = feriadosEntre(segunda, somaDias(segunda, 6));
    if (!feriados.length) continue;

    // A chave primária é a trava: só uma execução do minuto consegue marcar.
    const { error: erroMarca } = await supabase.from("feriados_avisados" as never).insert({ user_id: c.user_id, semana: segunda } as never);
    if (erroMarca) {
      if ((erroMarca as { code?: string }).code !== "23505") out.erros.push(`${c.user_id}: ${(erroMarca as { message: string }).message}`);
      continue;
    }

    const linhas = feriados.map((f) => `${DIAS[diaDaSemana(f.data)]}, ${ddmm(f.data)}: ${f.nome}${f.tipo === "facultativo" ? " (ponto facultativo)" : ""}`);
    const titulo = feriados.length === 1 ? "Essa semana tem feriado" : "Essa semana tem feriados";
    const corpo = linhas.join(" · ");
    const { error: erroAviso } = await supabase.from("faro_avisos").insert({ user_id: c.user_id, tipo: "feriados", titulo, corpo, destino: "week" });
    if (erroAviso) out.erros.push(`${c.user_id}: aviso na caixa falhou (${erroAviso.message})`);
    await enviarPushAoUsuario(supabase, c.user_id, { title: titulo, body: corpo.slice(0, 160), url: "/" }).catch(() => 0);
    out.avisados++;
  }
  return out;
}
