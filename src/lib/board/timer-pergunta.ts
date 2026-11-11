/**
 * "Você ainda está aí?": a regra que evita cronômetro esquecido rodando a noite toda.
 *
 * - Item com tempo previsto (evento, reunião, tarefa com duração): a primeira pergunta vem quando esse tempo acaba.
 * - Sem tempo previsto: a primeira pergunta vem depois de 30 min.
 * - Cada "Continuar" recomeça a contagem: a próxima pergunta vem 30 min depois.
 * - Sem resposta, o push do celular repete a cada 30 min, no máximo 3 vezes.
 *
 * Pura, para a tela e o servidor (push) usarem a mesma conta.
 */

export const INTERVALO_PERGUNTA_MIN = 30;
export const MAX_AVISOS_SEM_RESPOSTA = 3;
/** Respondeu "Pausar" até este tempo depois da pergunta: conta até agora. Depois disso, conta só até a pergunta. */
export const TOLERANCIA_DA_RESPOSTA_MIN = 5;

const MIN = 60000;

/** Minutos previstos de um item: o campo de tempo previsto, a duração digitada ou o intervalo início-fim do mesmo dia. */
export function minutosPrevistos(t: {
  expectedDurationMin?: number | null;
  durationMin?: number | null;
  date?: string | null;
  time?: string | null;
  endDate?: string | null;
  endTime?: string | null;
}): number | null {
  if (t.expectedDurationMin && t.expectedDurationMin > 0) return t.expectedDurationMin;
  if (t.durationMin && t.durationMin > 0) return t.durationMin;
  if (t.time && t.endTime && (!t.endDate || t.endDate === t.date)) {
    const [h1, m1] = t.time.split(":").map(Number);
    const [h2, m2] = t.endTime.split(":").map(Number);
    const d = h2 * 60 + m2 - (h1 * 60 + m1);
    if (Number.isFinite(d) && d > 0) return d;
  }
  return null;
}

/** Quando a pergunta vence (epoch ms). */
export function perguntaVenceEm(startedAtMs: number, confirmedAtMs: number | null, previstoMin: number | null): number {
  if (confirmedAtMs === null && previstoMin) return startedAtMs + previstoMin * MIN;
  return Math.max(startedAtMs, confirmedAtMs ?? 0) + INTERVALO_PERGUNTA_MIN * MIN;
}

/** Até quando o tempo vale ao pausar: agora, se respondeu logo; senão, só até a hora da pergunta. */
export function fimDoTempoAoPausar(venceEmMs: number, agoraMs: number): number {
  return agoraMs - venceEmMs <= TOLERANCIA_DA_RESPOSTA_MIN * MIN ? agoraMs : venceEmMs;
}

/** O aviso de push que está devido agora (epoch ms da "rodada"), ou null. */
export function pushDevidoDoCronometro(venceEmMs: number, agoraMs: number): number | null {
  if (agoraMs < venceEmMs) return null;
  const k = Math.min(MAX_AVISOS_SEM_RESPOSTA - 1, Math.floor((agoraMs - venceEmMs) / (INTERVALO_PERGUNTA_MIN * MIN)));
  return venceEmMs + k * INTERVALO_PERGUNTA_MIN * MIN;
}
