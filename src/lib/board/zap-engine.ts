import { dateFromISO, isoAddDays } from "@/lib/date-utils";
import type { Medication, MedicationGroup, Reminder } from "@/lib/types";

/**
 * O motor do ícone do zap.
 *
 * A regra do app, decidida com o Leandro: **onde o ícone do zap estiver aceso,
 * chega no WhatsApp**. Sininho é aviso dentro do app; zap é no celular.
 *
 * Por baixo, tudo vira Lembrete. Acender o zap num remédio cria um lembrete
 * vinculado àquele remédio; quem envia é o motor que já existe. A alternativa
 * — cada módulo mandando o seu — significaria quatro caminhos de envio e, como
 * se viu em 30/09, o mesmo bug de template pra caçar quatro vezes.
 *
 * Este arquivo é só cálculo: não fala com banco, não fala com React. É assim
 * que ele roda isolado em Node.
 */

export type OrigemDoZap = "medication" | "maintenance" | "event";

/**
 * A antecedência padrão de um lembrete criado pelo zap.
 *
 * Não pode ser zero: o motor de envio só considera lembretes com
 * `alertMinutesBefore` preenchido, e zero é falso em JavaScript. Dez minutos
 * também é mais útil que zero — o aviso chega a tempo de levantar e ir tomar o
 * remédio, e a mensagem já diz a hora marcada ("às 08:00").
 */
export const ANTECEDENCIA_PADRAO_MIN = 10;

/**
 * O horário de um remédio. Num tratamento com horário compartilhado, quem manda
 * é o grupo — é esse o sentido de "compartilhado", e ler o horário do remédio
 * nesse caso mostraria um valor que a tela nem deixa editar.
 */
export function horarioDaMedicacao(med: Medication, grupo: MedicationGroup | null): string | null {
  if (grupo && grupo.timeMode === "shared") return grupo.sharedTime;
  return med.time;
}

/** Último dia de um tratamento com duração definida. Sem duração, não tem fim. */
export function ultimoDia(startDate: string | null, durationDays: number | null): string | null {
  if (!startDate || !durationDays || durationDays <= 0) return null;
  return isoAddDays(startDate, durationDays - 1);
}

/**
 * A próxima data em que esse remédio é pra ser tomado, a partir de `hojeISO`.
 *
 * Devolve `null` quando não há próxima: tratamento encerrado, ou dias da semana
 * configurados mas nenhum deles cai dentro do que resta. Null aqui quer dizer
 * "não há o que lembrar", e o chamador apaga o lembrete em vez de deixar um
 * lembrete órfão apontando pro passado.
 */
export function proximaDataDaMedicacao(
  med: Medication,
  grupo: MedicationGroup | null,
  hojeISO: string
): string | null {
  // O começo pode estar no futuro (tratamento que ainda não arrancou).
  const comecos = [med.startDate, grupo?.startDate ?? null].filter((d): d is string => !!d);
  const comeco = comecos.length ? comecos.reduce((a, b) => (a > b ? a : b)) : null;
  let candidato = comeco && comeco > hojeISO ? comeco : hojeISO;

  // Dois fins possíveis (o do remédio e o do tratamento); vale o mais cedo.
  const fins = [
    ultimoDia(med.startDate, med.durationDays),
    ultimoDia(grupo?.startDate ?? null, grupo?.durationDays ?? null),
  ].filter((d): d is string => !!d);
  const fim = fins.length ? fins.reduce((a, b) => (a < b ? a : b)) : null;

  const dias = med.weekDays;
  // Sem dias marcados (ou com os sete), é todo dia — o primeiro candidato serve.
  if (!dias || dias.length === 0 || dias.length >= 7) {
    if (fim && candidato > fim) return null;
    return candidato;
  }

  // Com dias marcados, anda até achar um que bata. Quatorze passos cobrem duas
  // semanas inteiras: se não achou aí, não existe dia marcado.
  for (let i = 0; i < 14; i++) {
    if (fim && candidato > fim) return null;
    if (dias.includes(dateFromISO(candidato).getDay())) return candidato;
    candidato = isoAddDays(candidato, 1);
  }
  return null;
}

export type CamposDoLembrete = Pick<
  Reminder,
  "title" | "date" | "time" | "repeat" | "weekDays" | "alertMinutesBefore"
>;

/**
 * Os campos do lembrete que representa esse remédio.
 *
 * `null` quer dizer "esse remédio não tem o que lembrar": sem horário não existe
 * quando, e sem próxima data o tratamento acabou.
 */
export function lembreteDaMedicacao(
  med: Medication,
  grupo: MedicationGroup | null,
  hojeISO: string
): CamposDoLembrete | null {
  const hora = horarioDaMedicacao(med, grupo);
  if (!hora) return null;
  const data = proximaDataDaMedicacao(med, grupo, hojeISO);
  if (!data) return null;

  const dias = med.weekDays && med.weekDays.length > 0 && med.weekDays.length < 7 ? med.weekDays : null;
  return {
    // O título vira o corpo da mensagem no WhatsApp, junto com a data e a hora.
    title: `Tomar ${med.name}`,
    date: data,
    time: hora,
    // Com dias marcados, a repetição vive em weekDays; sem eles, é diário.
    repeat: dias ? "none" : "daily",
    weekDays: dias,
    alertMinutesBefore: ANTECEDENCIA_PADRAO_MIN,
  };
}

/**
 * A próxima ocorrência de um lembrete recorrente, depois de `aPartirDe`.
 *
 * Existe porque um lembrete recorrente dispararia **uma vez só**: o motor marca
 * `whatsapp_notified_at` e nunca mais olha pra ele. Alguém precisa virar a
 * página do dia, e é esta função que diz pra qual dia virar.
 */
export function proximaOcorrencia(
  r: Pick<Reminder, "date" | "repeat" | "weekDays">,
  aPartirDe: string
): string | null {
  if (!r.date) return null;
  const dias = r.weekDays;
  if (dias && dias.length > 0 && dias.length < 7) {
    let candidato = aPartirDe > r.date ? aPartirDe : r.date;
    for (let i = 1; i <= 14; i++) {
      candidato = isoAddDays(candidato, 1);
      if (dias.includes(dateFromISO(candidato).getDay())) return candidato;
    }
    return null;
  }
  if (r.repeat === "daily") {
    const base = aPartirDe > r.date ? aPartirDe : r.date;
    return isoAddDays(base, 1);
  }
  // Semanal/mensal/anual seguem o caminho que o app já usa em outro lugar; aqui
  // só o que o zap cria (diário ou por dia da semana) precisa virar sozinho.
  return null;
}
