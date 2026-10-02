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

/**
 * Os campos do lembrete que representa uma manutenção.
 *
 * `dueDate` vem do `maintenanceStatus` — ele é quem sabe juntar as duas naturezas
 * (vence por tempo, vence por quilometragem). Quando ele devolve `null`, não
 * existe data: é o caso de um item que vence por uso e ainda não tem leituras de
 * odômetro suficientes pra estimar quando. Sem data não há o que agendar, e o
 * lembrete honesto é nenhum.
 *
 * A antecedência sai do `alertDaysBefore` que o Leandro já configurou item a
 * item. Criar um campo novo pra isso seria pedir duas vezes a mesma coisa.
 *
 * E a anotação do item, quando existe, É a mensagem. Ele apontou que a
 * observação do "Fiz" já cobre o registro por serviço, então o campo do item
 * ficava sem função — virou o texto que chega no celular dele.
 */
export function lembreteDaManutencao(
  item: { name: string; alertDaysBefore: number; note?: string | null },
  dueDate: string | null
): CamposDoLembrete | null {
  if (!dueDate) return null;
  const dias = Math.max(0, item.alertDaysBefore);
  // O título vira o CORPO da mensagem no WhatsApp. Se ele escreveu a anotação
  // do item, é ela que ele quer receber — "Trocar o refil Intex A, R$ 89 na
  // Piscinas Vitória" diz o que fazer; "Manutenção: Filtros piscina" só diz que
  // existe. O campo do item era redundante com a observação do "Fiz", que é por
  // serviço, então passa a ter esse trabalho.
  const texto = item.note?.trim();
  return {
    title: texto ? texto : `Manutenção: ${item.name}`,
    date: dueDate,
    // Manhã: aviso de manutenção que chega às 23h não dá pra resolver no dia.
    time: "09:00",
    repeat: "none",
    weekDays: null,
    // Zero antecedência não serve: o motor de envio ignora lembrete com
    // alertMinutesBefore falso, e zero é falso em JavaScript.
    alertMinutesBefore: dias > 0 ? dias * 24 * 60 : ANTECEDENCIA_PADRAO_MIN,
  };
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
