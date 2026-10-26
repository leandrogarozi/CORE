import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { rowToMetanoiaFrase } from "@/lib/board/mappers";
import { fraseDaVez, horariosEmUso, creditoDaFrase, NOME_DA_METANOIA } from "@/lib/metanoia";

const FUSO_PADRAO = "America/Sao_Paulo";
// Se o agendador falhar uns minutos a frase ainda sai; passou disso, deixa para o próximo horário.
const JANELA_MIN = 15;

export type ResultadoMetanoia = { enviadas: number; semAparelho: number; erros: string[] };

function agoraNoFuso(nowMs: number, fuso: string): { dia: string; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return { dia: `${g("year")}-${g("month")}-${g("day")}`, minutos: Number(g("hour")) * 60 + Number(g("minute")) };
}

/**
 * Manda a frase da Metanoia nos horários que cada pessoa escolheu.
 *
 * Marca o envio ANTES de mandar (chave dia + horário) e só segue quem conseguiu marcar: o pior defeito aqui é
 * repetir a mesma frase a cada minuto. Canal à parte dos lembretes: falhar aqui não calar os outros.
 */
export async function enviarFrasesDaMetanoia(supabase: SupabaseClient<Database>, nowMs: number): Promise<ResultadoMetanoia> {
  const out: ResultadoMetanoia = { enviadas: 0, semAparelho: 0, erros: [] };
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    out.erros.push("chaves VAPID não configuradas no servidor");
    return out;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: configs, error } = await supabase
    .from("settings")
    .select("user_id, timezone, metanoia_vezes, metanoia_horarios, metanoia_push")
    .eq("metanoia_push", true);
  if (error) {
    out.erros.push(error.message);
    return out;
  }

  // Quem tem horário vencendo agora (dentro da janela).
  const devidos: { userId: string; dia: string; horario: string; indice: number }[] = [];
  for (const c of configs ?? []) {
    const { dia, minutos } = agoraNoFuso(nowMs, c.timezone || FUSO_PADRAO);
    horariosEmUso(c.metanoia_vezes, c.metanoia_horarios ?? []).forEach((h, indice) => {
      const [hh, mm] = h.split(":").map(Number);
      const alvo = hh * 60 + mm;
      if (Number.isFinite(alvo) && minutos >= alvo && minutos - alvo <= JANELA_MIN) {
        devidos.push({ userId: c.user_id, dia, horario: h, indice });
      }
    });
  }
  if (!devidos.length) return out;

  const ids = [...new Set(devidos.map((d) => d.userId))];
  const [{ data: frasesRows, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
    supabase.from("metanoia_frases").select("*").in("user_id", ids).eq("status", "aprovada"),
    supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", ids),
  ]);
  if (e1 || e2) {
    out.erros.push((e1 ?? e2)!.message);
    return out;
  }

  for (const d of devidos) {
    const frases = (frasesRows ?? []).filter((r) => r.user_id === d.userId).map(rowToMetanoiaFrase);
    const frase = fraseDaVez(frases, d.dia, d.indice);
    if (!frase) continue;
    const aparelhos = (subs ?? []).filter((s) => s.user_id === d.userId);
    if (!aparelhos.length) {
      out.semAparelho++;
      continue;
    }
    // A chave primária é a trava: só uma execução consegue inserir o par dia + horário.
    const { error: erroMarca } = await supabase
      .from("metanoia_envios")
      .insert({ user_id: d.userId, dia: d.dia, horario: d.horario, frase_id: frase.id });
    if (erroMarca) {
      if (erroMarca.code !== "23505") out.erros.push(`${d.userId}: ${erroMarca.message}`);
      continue;
    }
    const credito = creditoDaFrase(frase);
    const payload = JSON.stringify({ title: NOME_DA_METANOIA, body: credito ? `${frase.texto}\n— ${credito}` : frase.texto, url: "/?ver=metanoia" });
    const mortos: string[] = [];
    await Promise.all(
      aparelhos.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) mortos.push(s.endpoint);
          else out.erros.push(`${d.userId}: push recusado (${status ?? "sem código"})`);
        }
      })
    );
    if (mortos.length) await supabase.from("push_subscriptions").delete().eq("user_id", d.userId).in("endpoint", mortos);
    out.enviadas++;
  }
  return out;
}
