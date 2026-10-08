import { dateFromISO, isoAddDays } from "@/lib/date-utils";
import { duracaoDoSonoMin, fmtHorasMin } from "@/lib/board/sono";
import type { BoardState } from "@/lib/types";

/**
 * O resumo do dia que o FARO entrega à IA: o que há para hoje, o que está
 * atrasado, os lembretes e os hábitos. Só o que ajuda a conversar sobre a rotina.
 *
 * FICA DE FORA, de propósito: medicamentos e tratamentos (esta função nem recebe
 * essas tabelas, e lembrete que nasceu de remédio ou refeição é pulado) e todo
 * texto livre de saúde (observação de dieta, comentário de humor).
 * ENTRA, a pedido dele para cruzar dados: só os NÚMEROS do registro do dia
 * (humor 1 a 5, horas de sono, água, % da dieta), no panorama dos 14 dias.
 *
 * Módulo puro: sem rede e sem banco, testável com dados de mentira.
 */

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const LIMITE_ATRASADAS = 12;
const LIMITE_LINHAS = 25;


type Estado = Pick<BoardState, "tasks" | "reminders" | "habits" | "fixedBlocks" | "checklists" | "dailyLogs" | "taskTimeEntries">;

const dataBr = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

function diasEntre(depois: string, antes: string): number {
  return Math.round((dateFromISO(depois).getTime() - dateFromISO(antes).getTime()) / 86400000);
}

function sobra(total: number, mostrados: number): string {
  return total > mostrados ? `\n  (mais ${total - mostrados} não listadas)` : "";
}

export function resumoDoDia(estado: Estado, hoje: string): string {
  const linhas: string[] = [];
  const dia = DIAS[dateFromISO(hoje).getDay()];
  linhas.push(`Hoje é ${dia}, ${dataBr(hoje)}/${hoje.slice(0, 4)} (data ISO: ${hoje}).`);

  const ativas = estado.tasks.filter((t) => !t.deletedAt);
  const deHoje = ativas.filter((t) => t.date === hoje);
  const pendentes = deHoje.filter((t) => !t.done).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  const feitas = deHoje.filter((t) => t.done);

  linhas.push(`\nTAREFAS DE HOJE: ${pendentes.length} pendente(s), ${feitas.length} concluída(s).`);
  for (const t of pendentes.slice(0, LIMITE_LINHAS)) {
    const marcas = [
      t.time ? t.time : null,
      t.isEvent ? "compromisso" : null,
      t.challenging ? "desafiadora" : null,
      t.priority === "alta" ? "prioridade alta" : null,
      t.category,
    ].filter(Boolean);
    linhas.push(`- ${t.title}${marcas.length ? ` (${marcas.join(", ")})` : ""}`);
  }
  if (pendentes.length > LIMITE_LINHAS) linhas.push(sobra(pendentes.length, LIMITE_LINHAS).trim());
  if (feitas.length) {
    linhas.push(`Já concluídas hoje: ${feitas.slice(0, 10).map((t) => t.title).join("; ")}${feitas.length > 10 ? "…" : ""}`);
  }

  const atrasadas = ativas
    .filter((t) => t.date && t.date < hoje && !t.done)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  if (atrasadas.length) {
    linhas.push(`\nTAREFAS ATRASADAS: ${atrasadas.length}.`);
    for (const t of atrasadas.slice(0, LIMITE_ATRASADAS)) {
      linhas.push(`- ${t.title} (era para ${dataBr(t.date!)}, ${diasEntre(hoje, t.date!)} dia(s) de atraso)`);
    }
    if (atrasadas.length > LIMITE_ATRASADAS) linhas.push(sobra(atrasadas.length, LIMITE_ATRASADAS).trim());
  }

  const semData = ativas.filter((t) => !t.date && !t.done).length;
  if (semData) linhas.push(`\nTarefas sem data (backlog): ${semData}.`);

  // Lembretes que o Leandro criou ou que vêm de manutenção, evento e compras.
  // Remédio e refeição da dieta são saúde: ficam de fora.
  const lembretes = estado.reminders.filter(
    (r) => !r.deletedAt && !r.done && r.sourceKind !== "medication" && r.sourceKind !== "diet_meal"
  );
  const lembretesHoje = lembretes.filter((r) => r.date === hoje).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const lembretesVencidos = lembretes.filter((r) => r.date && r.date < hoje);
  if (lembretesHoje.length || lembretesVencidos.length) {
    linhas.push(`\nLEMBRETES: ${lembretesHoje.length} para hoje, ${lembretesVencidos.length} vencido(s).`);
    for (const r of lembretesHoje.slice(0, LIMITE_LINHAS)) linhas.push(`- ${r.time ? r.time + " " : ""}${r.title}`);
    for (const r of lembretesVencidos.slice(0, 8)) linhas.push(`- (vencido ${dataBr(r.date!)}) ${r.title}`);
  }

  const doDia = (item: { logs: Record<string, { checked: boolean }> }) => item.logs[hoje]?.checked === true;
  if (estado.habits.length) {
    const feitos = estado.habits.filter(doDia).map((h) => h.name);
    const faltam = estado.habits.filter((h) => !doDia(h)).map((h) => h.name);
    linhas.push(`\nHÁBITOS: feitos hoje: ${feitos.join(", ") || "nenhum ainda"}. Faltam: ${faltam.join(", ") || "nenhum"}.`);
  }
  if (estado.fixedBlocks.length) {
    const blocos = estado.fixedBlocks.map((b) => `${b.name}${doDia(b) ? " (feito)" : ""}`);
    linhas.push(`Blocos fixos da rotina: ${blocos.join(", ")}.`);
  }

  // O dia seguinte ajuda a conversar sobre "o que vem aí".
  const amanha = isoAddDays(hoje, 1);
  const deAmanha = ativas.filter((t) => t.date === amanha && !t.done);
  if (deAmanha.length) {
    linhas.push(`\nAMANHÃ (${dataBr(amanha)}): ${deAmanha.slice(0, 10).map((t) => (t.time ? t.time + " " : "") + t.title).join("; ")}`);
  }

  const comGastos = estado.checklists.filter((c) => c.expensesEnabled).map((c) => c.title);
  if (estado.checklists.length) {
    linhas.push(
      `\nCHECKLISTS: ${estado.checklists.map((c) => c.title).join("; ")}. Com aba de Gastos ligada: ${comGastos.join("; ") || "nenhum"}.`
    );
  }

  linhas.push(panoramaDosDias(estado, hoje, 14));
  return linhas.join("\n");
}

/** Um dia por linha, dos mais recentes aos mais antigos: o material para cruzar dados. */
export function panoramaDosDias(estado: Estado, hoje: string, dias: number): string {
  const feitasPorDia = new Map<string, number>();
  for (const t of estado.tasks) {
    if (t.done && t.date && !t.deletedAt) feitasPorDia.set(t.date, (feitasPorDia.get(t.date) ?? 0) + 1);
  }
  const segundosPorDia = new Map<string, number>();
  for (const e of estado.taskTimeEntries) segundosPorDia.set(e.date, (segundosPorDia.get(e.date) ?? 0) + e.seconds);

  const linhas = [`\nPANORAMA DOS ÚLTIMOS ${dias} DIAS (um dia por linha; "—" = não anotado):`];
  for (let i = 0; i < dias; i++) {
    const iso = isoAddDays(hoje, -i);
    const log = estado.dailyLogs[iso];
    const sono = duracaoDoSonoMin(log?.sleptAt ?? null, log?.wokeAt ?? null);
    const horas = (segundosPorDia.get(iso) ?? 0) / 3600;
    const partes = [
      `${feitasPorDia.get(iso) ?? 0} tarefas concluídas`,
      horas > 0 ? `${horas.toFixed(1).replace(".", ",")}h cronometradas` : "sem cronômetro",
      `humor ${log?.mood === null || log?.mood === undefined ? "—" : log.mood === 0 ? "doente" : log.mood}`,
      `sono ${sono === null ? "—" : fmtHorasMin(sono)}`,
      `água ${log && log.waterMl > 0 ? log.waterMl + "ml" : "—"}`,
      `dieta ${log?.dietPct === null || log?.dietPct === undefined ? "—" : log.dietPct + "%"}`,
    ];
    linhas.push(`${dataBr(iso)} (${DIAS[dateFromISO(iso).getDay()].slice(0, 3)}): ${partes.join(", ")}`);
  }
  return linhas.join("\n");
}
