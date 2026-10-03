import { isoAddDays } from "@/lib/date-utils";
import type { DailyLog, Task } from "@/lib/types";

// Insight de sono feito só com os dados do próprio FARO, sem IA e sem API:
// média de horas por noite e um cruzamento simples com tarefas concluídas.

const MIN_NOITES = 3;
const SONO_CURTO_MIN = 7 * 60;
const DURACAO_MIN_VALIDA = 2 * 60; // abaixo disso é quase certo erro de digitação
const DURACAO_MAX_VALIDA = 14 * 60;

function minutosDoDia(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Dormiu 23:30 e acordou 07:00 → 450 min; dormiu 00:30 e acordou 07:00 → 390.
// A conta trata o horário de dormir como "antes do despertar", dando a volta
// na meia-noite quando precisa. Dado fora do plausível volta null.
export function duracaoDoSonoMin(sleptAt: string | null, wokeAt: string | null): number | null {
  if (!sleptAt || !wokeAt) return null;
  const d = (minutosDoDia(wokeAt) - minutosDoDia(sleptAt) + 1440) % 1440;
  if (d < DURACAO_MIN_VALIDA || d > DURACAO_MAX_VALIDA) return null;
  return d;
}

// Horário de dormir na escala "a partir do meio-dia" (23:00 → 660, 01:00 → 780),
// pra que quem dorme perto da meia-noite não vire média das 12h.
function deitarNaEscala(hhmm: string): number {
  return (minutosDoDia(hhmm) - 720 + 1440) % 1440;
}

function escalaParaHHMM(esc: number): string {
  const m = (Math.round(esc) + 720) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function fmtHorasMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export interface ResumoSono {
  noites: number;
  mediaMin: number;
  deitarMedio: string; // "HH:MM"
  dica: string | null;
}

export function resumoDoSono(
  dailyLogs: Record<string, DailyLog>,
  tasks: Task[],
  hojeISO: string,
  dias: number
): ResumoSono | null {
  const noites: { iso: string; dur: number; deitar: number }[] = [];
  for (let i = 0; i < dias; i++) {
    const iso = isoAddDays(hojeISO, -i);
    const log = dailyLogs[iso];
    const dur = duracaoDoSonoMin(log?.sleptAt ?? null, log?.wokeAt ?? null);
    if (dur === null || !log?.sleptAt) continue;
    noites.push({ iso, dur, deitar: deitarNaEscala(log.sleptAt) });
  }
  if (noites.length < MIN_NOITES) return null;

  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mediaMin = media(noites.map((n) => n.dur));
  const deitarMedia = media(noites.map((n) => n.deitar));
  const desvio = Math.sqrt(media(noites.map((n) => (n.deitar - deitarMedia) ** 2)));

  // Tarefas concluídas por dia (vale a data da tarefa).
  const feitasPorDia: Record<string, number> = {};
  for (const t of tasks) {
    if (t.done && t.date && !t.deletedAt) feitasPorDia[t.date] = (feitasPorDia[t.date] ?? 0) + 1;
  }
  const curtas = noites.filter((n) => n.dur < SONO_CURTO_MIN).map((n) => feitasPorDia[n.iso] ?? 0);
  const boas = noites.filter((n) => n.dur >= SONO_CURTO_MIN).map((n) => feitasPorDia[n.iso] ?? 0);

  let dica: string | null = null;
  if (curtas.length >= 3 && boas.length >= 3) {
    const mc = media(curtas);
    const mb = media(boas);
    if (mb - mc >= 1 && mb >= mc * 1.25) {
      const f = (n: number) => n.toFixed(1).replace(".", ",");
      dica = `Nos dias em que você dormiu 7h ou mais, concluiu em média ${f(mb)} tarefas; nos de sono curto, ${f(mc)}. Dormir um pouco mais cedo pode ajudar a render mais.`;
    }
  }
  if (!dica && mediaMin < SONO_CURTO_MIN) {
    dica = "Sua média está abaixo de 7h. Tente dormir cerca de 30 minutos mais cedo e veja como o dia rende.";
  }
  if (!dica && desvio > 90) {
    dica = "Seu horário de dormir varia bastante. Horário mais regular costuma melhorar a qualidade do sono.";
  }
  if (!dica) dica = "Boa média de sono. Continue assim.";

  return { noites: noites.length, mediaMin, deitarMedio: escalaParaHHMM(deitarMedia), dica };
}
