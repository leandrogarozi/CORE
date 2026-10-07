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

export type OrigemDoZap = "medication" | "maintenance" | "diet_meal" | "event";

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
  const candidato = comeco && comeco > hojeISO ? comeco : hojeISO;

  // Dois fins possíveis (o do remédio e o do tratamento); vale o mais cedo.
  const fins = [
    ultimoDia(med.startDate, med.durationDays),
    ultimoDia(grupo?.startDate ?? null, grupo?.durationDays ?? null),
  ].filter((d): d is string => !!d);
  const fim = fins.length ? fins.reduce((a, b) => (a < b ? a : b)) : null;

  return primeiroDiaQueBate(med.weekDays, candidato, fim);
}

/**
 * O primeiro dia, a partir de `aPartirDe`, que cai num dos dias da semana
 * marcados — respeitando um fim, quando existe.
 *
 * Sem dias marcados (ou com os sete) é todo dia, e o próprio `aPartirDe` serve.
 * Com dias marcados, anda dia a dia: catorze passos cobrem duas semanas
 * inteiras, então se não achou aí não existe dia que bata.
 */
function primeiroDiaQueBate(dias: number[] | null, aPartirDe: string, fim: string | null): string | null {
  let candidato = aPartirDe;
  if (!dias || dias.length === 0 || dias.length >= 7) {
    if (fim && candidato > fim) return null;
    return candidato;
  }
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

export type EtapaDaManutencao = "comprar" | "antes" | "hoje" | "vencido1" | "vencido2" | "vencido3";

/**
 * Dias depois do vencimento em que o FARO insiste, se o item não foi marcado
 * como feito: no dia seguinte, 2 dias depois disso e 4 dias depois disso. Três
 * e para — mais que isso vira ruído e o aviso passa a ser ignorado.
 */
export const INSISTENCIA_DIAS_APOS_VENCER = [1, 3, 7] as const;

export interface LembreteDeEtapa {
  etapa: EtapaDaManutencao;
  campos: CamposDoLembrete;
  /** O zap do momento a que a etapa pertence. O push chega sempre. */
  whatsapp: boolean;
  /** O sininho do momento: mostra também dentro do app (banner e agenda). */
  inApp: boolean;
}

type ItemParaLembretes = {
  name: string;
  note?: string | null;
  alertDaysBefore: number;
  buyDaysBefore: number | null;
  boughtOn: string | null;
  whatsapp: boolean;
  whatsappBuy: boolean;
  whatsappOverdue: boolean;
  appBuy: boolean;
  appDo: boolean;
  appOverdue: boolean;
  overdueFrom: string | null;
};

function diasEntre(deISO: string, ateISO: string): number {
  return Math.round((Date.parse(`${ateISO}T00:00:00Z`) - Date.parse(`${deISO}T00:00:00Z`)) / 86400000);
}

function plural(n: number, um: string, varios: string): string {
  return n === 1 ? um : varios;
}

/**
 * Os avisos de uma manutenção, nos três momentos que o Leandro pediu:
 *
 * 1. **Comprar** (só nos itens que pedem compra): `buyDaysBefore` dias antes.
 *    Para quando ele marca "Comprei".
 * 2. **Fazer**: `alertDaysBefore` dias antes e no próprio dia do vencimento.
 * 3. **Vencido**: se passar do dia sem "Feito", insiste 3 vezes (ver
 *    INSISTENCIA_DIAS_APOS_VENCER). "Lembrar de novo" (`overdueFrom`)
 *    recomeça a contagem de uma data nova.
 *
 * Cada aviso é um lembrete comum com data e hora (09:00): é assim que o push e
 * o WhatsApp, o teto de gasto e o registro de envio funcionam igual pra tudo.
 * Quem escolhe o canal pago é o zap de cada momento; o push chega sempre.
 *
 * Só entram avisos de hoje em diante. Marcar "Feito" muda a data de
 * vencimento, e quem chama recalcula tudo: o que ficou pra trás some sozinho.
 *
 * A anotação do item, quando existe, É o texto do aviso de fazer — ele a
 * escolheu como a mensagem que quer receber.
 */
export function lembretesDaManutencao(
  item: ItemParaLembretes,
  dueDate: string | null,
  hojeISO: string
): LembreteDeEtapa[] {
  if (!dueDate) return [];
  const saida: LembreteDeEtapa[] = [];
  const texto = item.note?.trim() || item.name;
  const base = { time: "09:00", repeat: "none" as const, weekDays: null, alertMinutesBefore: ANTECEDENCIA_PADRAO_MIN };
  const adicionar = (etapa: EtapaDaManutencao, date: string, title: string, whatsapp: boolean, inApp: boolean) => {
    if (date < hojeISO) return;
    saida.push({ etapa, campos: { ...base, date, title }, whatsapp, inApp });
  };

  if (item.buyDaysBefore && item.buyDaysBefore > 0 && !item.boughtOn) {
    adicionar("comprar", isoAddDays(dueDate, -item.buyDaysBefore), `Comprar para a manutenção: ${item.name}`, item.whatsappBuy, item.appBuy);
  }

  const antes = Math.max(0, item.alertDaysBefore);
  if (antes > 0) {
    adicionar(
      "antes",
      isoAddDays(dueDate, -antes),
      antes === 1 ? `Amanhã vence: ${texto}` : `Em ${antes} dias vence: ${texto}`,
      item.whatsapp,
      item.appDo
    );
  }
  adicionar("hoje", dueDate, `Hoje vence: ${texto}`, item.whatsapp, item.appDo);

  const inicio = item.overdueFrom && item.overdueFrom > dueDate ? item.overdueFrom : dueDate;
  INSISTENCIA_DIAS_APOS_VENCER.forEach((dias, i) => {
    const date = isoAddDays(inicio, dias);
    const atraso = diasEntre(dueDate, date);
    adicionar(
      `vencido${i + 1}` as EtapaDaManutencao,
      date,
      `Venceu há ${atraso} ${plural(atraso, "dia", "dias")} e ainda não foi feito: ${texto}`,
      item.whatsappOverdue,
      item.appOverdue
    );
  });
  return saida;
}

/**
 * Os campos do lembrete que representa uma refeição da Dieta.
 *
 * A regra é a que o Leandro descreveu e que o modelo já guardava: refeição com
 * o zap aceso e **sem** dias marcados avisa todo dia no horário dela; com dias
 * marcados, só nesses dias. Nada de campo novo — a tela de Dieta já pergunta as
 * duas coisas.
 *
 * Diferente do remédio, refeição não tem começo nem fim: ninguém "termina" de
 * almoçar em 30 dias. Por isso o `fim` vai nulo.
 */
export function lembreteDaRefeicao(
  meal: { name: string; time: string; weekDays: number[] | null },
  hojeISO: string
): CamposDoLembrete | null {
  if (!meal.time) return null;
  const dias = meal.weekDays && meal.weekDays.length > 0 && meal.weekDays.length < 7 ? meal.weekDays : null;
  const data = primeiroDiaQueBate(dias, hojeISO, null);
  if (!data) return null;
  return {
    // Mesma forma de "Manutenção: X" — o prefixo diz de onde veio, e no
    // WhatsApp a mensagem fica "Refeição: Lanche da tarde — 01/10 às 16:00".
    title: `Refeição: ${meal.name}`,
    date: data,
    time: meal.time,
    repeat: dias ? "none" : "daily",
    weekDays: dias,
    alertMinutesBefore: ANTECEDENCIA_PADRAO_MIN,
  };
}

/**
 * Tira da fila os lembretes cuja tarefa/reunião está na lixeira.
 *
 * Mora aqui, fora da rota, pra poder ser testada sem banco: é a trava que
 * impede a repetição do caso da "Reunião: Reuniao" — reunião apagada às 23:02,
 * mensagem chegando às 01:50 porque o lembrete órfão continuou vivo.
 */
export function semLembreteDeTarefaApagada<T extends { task_id: string | null }>(
  linhas: T[],
  tarefasNaLixeira: Set<string>
): T[] {
  if (tarefasNaLixeira.size === 0) return linhas;
  return linhas.filter((l) => !l.task_id || !tarefasNaLixeira.has(l.task_id));
}
