import { isoAddDays, todayISO } from "@/lib/date-utils";
import type { MaintenanceAsset, MaintenanceItem, OdometerReading } from "@/lib/types";

// Sugestões de itens já preenchidas, pra não começar de uma tela vazia.
// Os intervalos são os usuais de mercado e servem de ponto de partida — quem
// manda é o manual do veículo, e todo campo é editável depois.
export const MAINTENANCE_SUGGESTIONS: Record<string, { name: string; months?: number; distance?: number }[]> = {
  veiculo: [
    { name: "Troca de óleo", months: 12, distance: 10000 },
    { name: "Filtro de óleo", months: 12, distance: 10000 },
    { name: "Filtro de ar", months: 12, distance: 15000 },
    { name: "Filtro de combustível", months: 24, distance: 20000 },
    { name: "Filtro do ar-condicionado", months: 12, distance: 15000 },
    { name: "Rodízio de pneus", months: 6, distance: 10000 },
    { name: "Troca de pneus", months: 48, distance: 50000 },
    { name: "Alinhamento e balanceamento", months: 6, distance: 10000 },
    { name: "Pastilhas de freio", months: 24, distance: 30000 },
    { name: "Revisão programada", months: 12, distance: 10000 },
    { name: "IPVA", months: 12 },
    { name: "Licenciamento", months: 12 },
    { name: "Seguro", months: 12 },
  ],
  casa: [
    { name: "Limpeza do ar-condicionado", months: 6 },
    { name: "Filtro do purificador de água", months: 6 },
    { name: "Limpeza da caixa d'água", months: 6 },
    { name: "Dedetização", months: 12 },
    { name: "Recarga do extintor", months: 12 },
    { name: "Revisão do gás", months: 12 },
  ],
  outro: [],
};

/** Soma meses a uma data ISO, sem passar por fuso. Dia 31 + 1 mês vira o último dia do mês seguinte. */
export function isoAddMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + months, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** Leitura mais recente do odômetro. */
export function lastReading(readings: OdometerReading[]): OdometerReading | null {
  return [...readings].sort((a, b) => a.readOn.localeCompare(b.readOn)).at(-1) ?? null;
}

/**
 * Ritmo de rodagem, em km por dia. Usa a leitura mais antiga e a mais recente:
 * é o que dá média estável. Com uma leitura só não dá pra saber o ritmo — e
 * chutar um número aqui seria pior do que admitir que não se sabe.
 */
export function distancePerDay(readings: OdometerReading[]): number | null {
  if (readings.length < 2) return null;
  const ordenadas = [...readings].sort((a, b) => a.readOn.localeCompare(b.readOn));
  const primeira = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];
  const dias = daysBetween(primeira.readOn, ultima.readOn);
  const rodados = ultima.reading - primeira.reading;
  if (dias <= 0 || rodados <= 0) return null;
  return rodados / dias;
}

export type DueBy = "tempo" | "uso" | "nenhum";
export type DueState = "ok" | "proximo" | "vencido" | "sem_base";

export interface MaintenanceStatus {
  /** Data em que vence por tempo. */
  dueDateByTime: string | null;
  /** Marca do odômetro em que vence por uso. */
  dueOdometer: number | null;
  /** Data PROJETADA em que o odômetro chega na marca, pelo ritmo de rodagem. */
  dueDateByUse: string | null;
  /** A data que vale: a que vier primeiro. */
  dueDate: string | null;
  dueBy: DueBy;
  daysLeft: number | null;
  distanceLeft: number | null;
  state: DueState;
}

/**
 * Quando esse item vence, de verdade. O ponto central do módulo: um item pode
 * vencer por tempo E por uso, e o que vale é o que chegar primeiro. Sem isso o
 * aviso sai errado nos dois sentidos — tarde demais pra quem roda muito, cedo
 * demais pra quem deixou o carro parado.
 */
export function maintenanceStatus(
  item: Pick<
    MaintenanceItem,
    "intervalMonths" | "intervalDistance" | "lastDoneOn" | "lastDoneOdometer" | "alertDaysBefore" | "alertDistanceBefore"
  >,
  asset: Pick<MaintenanceAsset, "tracksOdometer">,
  readings: OdometerReading[],
  today: string = todayISO()
): MaintenanceStatus {
  const dueDateByTime =
    item.intervalMonths && item.lastDoneOn ? isoAddMonths(item.lastDoneOn, item.intervalMonths) : null;

  const dueOdometer =
    asset.tracksOdometer && item.intervalDistance && item.lastDoneOdometer !== null
      ? item.lastDoneOdometer + item.intervalDistance
      : null;

  const atual = lastReading(readings);
  const ritmo = distancePerDay(readings);
  const distanceLeft = dueOdometer !== null && atual ? dueOdometer - atual.reading : null;

  // Converte a marca de km numa data usando o ritmo de rodagem. É isso que
  // permite avisar por km: sem virar data, km é um número parado.
  let dueDateByUse: string | null = null;
  if (dueOdometer !== null && atual && ritmo && ritmo > 0) {
    const faltam = dueOdometer - atual.reading;
    dueDateByUse = isoAddDays(atual.readOn, Math.round(faltam / ritmo));
  }

  let dueDate: string | null = null;
  let dueBy: DueBy = "nenhum";
  if (dueDateByTime && dueDateByUse) {
    dueBy = dueDateByUse < dueDateByTime ? "uso" : "tempo";
    dueDate = dueBy === "uso" ? dueDateByUse : dueDateByTime;
  } else if (dueDateByTime) {
    dueDate = dueDateByTime;
    dueBy = "tempo";
  } else if (dueDateByUse) {
    dueDate = dueDateByUse;
    dueBy = "uso";
  }

  const daysLeft = dueDate ? daysBetween(today, dueDate) : null;

  let state: DueState = "sem_base";
  if (distanceLeft !== null && distanceLeft <= 0) state = "vencido";
  else if (daysLeft !== null && daysLeft < 0) state = "vencido";
  else if (daysLeft !== null && daysLeft <= item.alertDaysBefore) state = "proximo";
  else if (distanceLeft !== null && distanceLeft <= item.alertDistanceBefore) state = "proximo";
  else if (dueDate !== null || distanceLeft !== null) state = "ok";

  return { dueDateByTime, dueOdometer, dueDateByUse, dueDate, dueBy, daysLeft, distanceLeft, state };
}

/** A leitura do odômetro está velha o bastante pra pedir uma conferida? */
export function odometerCheckDue(
  asset: Pick<MaintenanceAsset, "tracksOdometer" | "odometerReminderDays">,
  readings: OdometerReading[],
  today: string = todayISO()
): boolean {
  if (!asset.tracksOdometer || !asset.odometerReminderDays) return false;
  const atual = lastReading(readings);
  if (!atual) return true; // nunca leu: precisa da primeira
  return daysBetween(atual.readOn, today) >= asset.odometerReminderDays;
}
