import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { rowToTask } from "@/lib/board/mappers";
import { entraEmReunioes, type Task } from "@/lib/types";

/**
 * Espelho FARO → Google Agenda, de MÃO ÚNICA, só para o dono do FARO (conta com `modo_dono`).
 *
 * Como funciona: o FARO tem uma "conta de serviço" do Google (um robô) e a pessoa compartilha a agenda dela
 * com o e-mail desse robô. Sobe para a agenda: tarefa marcada como EVENTO e reuniões, com data (e hora, se tiver).
 * Não sobe: tarefa comum, tarefa de saúde, tarefa na Lixeira. Evento criado direto no Google não volta para o FARO.
 *
 * Sem `GOOGLE_SERVICE_ACCOUNT_JSON` e `GOOGLE_CALENDAR_ID` na Vercel, não faz nada (é seguro deixar desligado).
 * O vínculo tarefa ↔ evento fica na tabela `google_eventos`; a "assinatura" detecta o que mudou.
 */

const ESCOPO = "https://www.googleapis.com/auth/calendar.events";
const LIMITE_POR_RODADA = 15; // chamadas ao Google por execução: o motor roda todo minuto, o resto fica para a próxima

export interface ContaDeServico {
  client_email: string;
  private_key: string;
}

export function lerContaDeServico(bruto: string | undefined): ContaDeServico | null {
  if (!bruto) return null;
  try {
    const j = JSON.parse(bruto) as Partial<ContaDeServico>;
    if (typeof j.client_email === "string" && typeof j.private_key === "string") {
      return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n") };
    }
  } catch {
    /* JSON inválido: tratado como desligado */
  }
  return null;
}

const base64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** JWT assinado (RS256) que o Google troca por um token de acesso. */
export function montarJwt(conta: ContaDeServico, agoraSeg: number): string {
  const cabecalho = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = base64url(
    JSON.stringify({ iss: conta.client_email, scope: ESCOPO, aud: "https://oauth2.googleapis.com/token", iat: agoraSeg, exp: agoraSeg + 3600 })
  );
  const assinatura = createSign("RSA-SHA256").update(`${cabecalho}.${corpo}`).sign(conta.private_key);
  return `${cabecalho}.${corpo}.${base64url(assinatura)}`;
}

let cacheToken: { valor: string; expiraEm: number } | null = null;

async function tokenDeAcesso(conta: ContaDeServico): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  if (cacheToken && cacheToken.expiraEm - 60 > agora) return cacheToken.valor;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: montarJwt(conta, agora) }),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !j.access_token) throw new Error(`Google recusou a credencial: ${j.error_description ?? res.status}`);
  cacheToken = { valor: j.access_token, expiraEm: agora + (j.expires_in ?? 3600) };
  return j.access_token;
}

async function chamar(conta: ContaDeServico, metodo: string, caminho: string, corpo?: object): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await tokenDeAcesso(conta)}`, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

// ---------- o que sobe e como vira evento (funções puras) ----------

/** Tarefa que merece estar na agenda do Google. */
export function sobeParaOGoogle(t: Task): boolean {
  return !t.deletedAt && !!t.date && t.category !== "saude" && t.category2 !== "saude" && (t.isEvent || entraEmReunioes(t));
}

const soma = (data: string, dias: number): string => {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

function somaMinutos(data: string, hhmm: string, min: number): { data: string; hora: string } {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + min;
  const dias = Math.floor(total / 1440);
  const resto = ((total % 1440) + 1440) % 1440;
  return { data: dias ? soma(data, dias) : data, hora: `${String(Math.floor(resto / 60)).padStart(2, "0")}:${String(resto % 60).padStart(2, "0")}` };
}

export function montarEvento(t: Task, fuso: string): Record<string, unknown> {
  const titulo = t.title.trim() || "(sem título)";
  const comum = { summary: titulo, description: "Criado pelo FARO. Edite no FARO: mudanças feitas aqui não voltam.", source: { title: "FARO", url: "https://core-app-seven-gamma.vercel.app" } };
  if (!t.time) {
    // Dia inteiro. No Google o fim é exclusivo: um evento de 1 dia termina no dia seguinte.
    const fim = t.endDate && t.endDate > t.date! ? t.endDate : t.date!;
    return { ...comum, start: { date: t.date }, end: { date: soma(fim, 1) } };
  }
  const hora = t.time.slice(0, 5);
  let fimData = t.endDate ?? t.date!;
  let fimHora = t.endTime?.slice(0, 5) ?? null;
  if (!fimHora || `${fimData}T${fimHora}` <= `${t.date}T${hora}`) {
    const f = somaMinutos(t.date!, hora, t.expectedDurationMin && t.expectedDurationMin > 0 ? t.expectedDurationMin : 60);
    fimData = f.data;
    fimHora = f.hora;
  }
  return {
    ...comum,
    start: { dateTime: `${t.date}T${hora}:00`, timeZone: fuso },
    end: { dateTime: `${fimData}T${fimHora}:00`, timeZone: fuso },
  };
}

/** Muda quando algo que aparece no Google muda. */
export function assinaturaDoEvento(t: Task, fuso: string): string {
  return JSON.stringify(montarEvento(t, fuso));
}

// ---------- sincronização ----------

export interface ResultadoDoEspelho {
  ligado: boolean;
  criados: number;
  atualizados: number;
  removidos: number;
  erros: string[];
}

export async function espelharNoGoogle(supabase: SupabaseClient<Database>): Promise<ResultadoDoEspelho> {
  const r: ResultadoDoEspelho = { ligado: false, criados: 0, atualizados: 0, removidos: 0, erros: [] };
  const conta = lerContaDeServico(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const agenda = (process.env.GOOGLE_CALENDAR_ID ?? "").trim();
  if (!conta || !agenda) return r;
  r.ligado = true;

  const { data: donos, error: erroDonos } = await supabase.from("settings").select("user_id, timezone").eq("feature_flags->>modo_dono", "true");
  if (erroDonos) {
    r.erros.push(`donos: ${erroDonos.message}`);
    return r;
  }
  let chamadas = 0;
  const enc = encodeURIComponent(agenda);

  for (const dono of donos ?? []) {
    const fuso = dono.timezone || "America/Sao_Paulo";
    const desde = soma(new Date().toISOString().slice(0, 10), -2); // não mexe no passado distante
    const [{ data: linhas, error: e1 }, { data: vinculos, error: e2 }] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", dono.user_id).gte("date", desde),
      supabase.from("google_eventos").select("*").eq("user_id", dono.user_id),
    ]);
    if (e1 || e2) {
      r.erros.push(`ler dados: ${(e1 ?? e2)!.message}`);
      continue;
    }
    const tarefas = (linhas ?? []).map(rowToTask);
    const porId = new Map(tarefas.map((t) => [t.id, t]));
    const vinculoPorTarefa = new Map((vinculos ?? []).map((v) => [v.task_id, v]));

    // criar e atualizar
    for (const t of tarefas) {
      if (chamadas >= LIMITE_POR_RODADA) return r;
      if (!sobeParaOGoogle(t)) continue;
      const sig = assinaturaDoEvento(t, fuso);
      const v = vinculoPorTarefa.get(t.id);
      try {
        if (!v) {
          chamadas++;
          const res = await chamar(conta, "POST", `/calendars/${enc}/events`, montarEvento(t, fuso));
          if (res.status >= 300 || typeof res.json.id !== "string") throw new Error(`criar: ${res.status} ${JSON.stringify(res.json).slice(0, 160)}`);
          await supabase.from("google_eventos").upsert({ task_id: t.id, user_id: dono.user_id, calendar_id: agenda, event_id: res.json.id, assinatura: sig });
          r.criados++;
        } else if (v.assinatura !== sig) {
          chamadas++;
          const res = await chamar(conta, "PATCH", `/calendars/${enc}/events/${encodeURIComponent(v.event_id)}`, montarEvento(t, fuso));
          if (res.status === 404 || res.status === 410) {
            // evento apagado à mão no Google: recria na próxima rodada
            await supabase.from("google_eventos").delete().eq("task_id", t.id);
            continue;
          }
          if (res.status >= 300) throw new Error(`atualizar: ${res.status} ${JSON.stringify(res.json).slice(0, 160)}`);
          await supabase.from("google_eventos").update({ assinatura: sig, atualizado_em: new Date().toISOString() }).eq("task_id", t.id);
          r.atualizados++;
        }
      } catch (e) {
        r.erros.push(`${t.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // remover o que deixou de valer (tarefa apagada, virou tarefa comum, perdeu a data ou é de saúde)
    for (const v of vinculos ?? []) {
      if (chamadas >= LIMITE_POR_RODADA) return r;
      const t = porId.get(v.task_id);
      if (t && sobeParaOGoogle(t)) continue;
      // tarefa fora da janela de datas (passado distante) não é lida: não mexe
      if (!t) {
        // fora da janela lida: só remove se a tarefa não existe mais, foi apagada ou perdeu a data
        const { data: existe } = await supabase.from("tasks").select("id, date, deleted_at").eq("id", v.task_id).maybeSingle();
        if (existe && !existe.deleted_at && existe.date && existe.date < desde) continue; // passado: deixa o evento lá
      }
      try {
        chamadas++;
        const res = await chamar(conta, "DELETE", `/calendars/${enc}/events/${encodeURIComponent(v.event_id)}`);
        if (res.status >= 300 && res.status !== 404 && res.status !== 410) throw new Error(`remover: ${res.status}`);
        await supabase.from("google_eventos").delete().eq("task_id", v.task_id);
        r.removidos++;
      } catch (e) {
        r.erros.push(`${v.task_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return r;
}
