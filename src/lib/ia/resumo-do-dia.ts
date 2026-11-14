import { dateFromISO, isoAddDays } from "@/lib/date-utils";
import { duracaoDoSonoMin, fmtHorasMin } from "@/lib/board/sono";
import { studyPlanMath, tempoPorModulo } from "@/lib/board/study-plan";
import { ciclosDoItem, maintenanceStatus } from "@/lib/board/maintenance";
import { ehRemedioOuSaude, situacaoDaValidade } from "@/lib/board/dispensa";
import { fmtRitmo, fmtTempo, mediaDeUso } from "@/lib/board/dispensa-uso";
import type { BoardState } from "@/lib/types";
import { novidadesDoFaro } from "@/lib/novidades";

/**
 * O resumo do dia que o FARO entrega à IA: o que há para hoje, o que está
 * atrasado, os lembretes e os hábitos. Só o que ajuda a conversar sobre a rotina.
 *
 * FICA DE FORA, de propósito: medicamentos e tratamentos (esta função nem recebe
 * essas tabelas, e lembrete que nasceu de remédio ou refeição é pulado) e todo
 * texto livre de saúde (observação de dieta, comentário de humor).
 * ENTRA, a pedido dele para cruzar dados: só os NÚMEROS do registro do dia
 * (humor 1 a 5, horas de sono, água, % da dieta), mais hábitos/blocos marcados e tempo de estudo, no panorama dos 14 dias.
 *
 * Módulo puro: sem rede e sem banco, testável com dados de mentira.
 */

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const LIMITE_ATRASADAS = 12;
const LIMITE_LINHAS = 25;


type Estado = Pick<BoardState, "tasks" | "reminders" | "habits" | "fixedBlocks" | "checklists" | "dailyLogs" | "taskTimeEntries" | "studyPlans"> &
  Partial<Pick<BoardState, "maintenanceAssets" | "maintenanceItems" | "maintenanceServices" | "odometerReadings" | "pantryItems" | "pantryUsage" | "quickNotes">>;

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

  // Os dias seguintes (depois de amanhã até 7 dias), para "o que tenho essa semana?".
  const proximos: string[] = [];
  for (let i = 2; i <= 7; i++) {
    const dia = isoAddDays(hoje, i);
    const doDiaX = ativas.filter((t) => t.date === dia && !t.done);
    if (!doDiaX.length) continue;
    const nome = DIAS[dateFromISO(dia).getDay()].replace("-feira", "");
    proximos.push(
      `${nome} ${dataBr(dia)}: ${doDiaX
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
        .slice(0, 6)
        .map((t) => (t.time ? t.time + " " : "") + t.title)
        .join("; ")}${doDiaX.length > 6 ? ` (+${doDiaX.length - 6})` : ""}`
    );
  }
  if (proximos.length) linhas.push(`\nPRÓXIMOS DIAS:\n${proximos.map((p) => `- ${p}`).join("\n")}`);

  // O panorama vem ANTES das seções longas (estudos, manutenção, dispensa): o resumo é cortado no
  // limite de caracteres, e o que fica no fim é o que se perde. Era isso que deixava só 3 dos 14 dias.
  linhas.push(panoramaDosDias(estado, hoje, 14));
  linhas.push(cruzamentosDosPeriodos(estado, hoje));

  const comGastos = estado.checklists.filter((c) => c.expensesEnabled).map((c) => c.title);
  if (estado.checklists.length) {
    linhas.push(
      `\nCHECKLISTS: ${estado.checklists.map((c) => c.title).join("; ")}. Com aba de Gastos ligada: ${comGastos.join("; ") || "nenhum"}.`
    );
  }

  const estudos = estado.studyPlans.filter((p) => p.status !== "concluido");
  if (estudos.length) {
    linhas.push("\nESTUDOS (planos; nomes exatos para a ferramenta de ajuste):");
    for (const p of estudos) {
      const sessoes = estado.tasks.filter((t) => !t.deletedAt && t.studyPlanId === p.id);
      const feitoSeg = estado.taskTimeEntries.filter((e) => sessoes.some((t) => t.id === e.taskId)).reduce((x, e) => x + e.seconds, 0);
      const m = studyPlanMath(p, Math.round(feitoSeg / 60), hoje);
      const partes = [
        `${p.status === "pausado" ? "PAUSADO, " : ""}total ${p.totalMinutes ? fmtHorasMin(p.totalMinutes) : "não definido"}`,
        `feito ${fmtHorasMin(Math.round(feitoSeg / 60))}`,
        `${p.sessionMinutes} min por sessão`,
        `dias ${p.weekDays.map((d) => DIAS[d].slice(0, 3)).join("/") || "nenhum"}`,
        p.deadline ? `prazo ${dataBr(p.deadline)}/${p.deadline.slice(0, 4)}${m.naoCabeNoPrazo ? " (NÃO FECHA NO PRAZO neste ritmo)" : ""}` : "sem prazo",
        m.terminaEm ? `no ritmo atual termina em ${dataBr(m.terminaEm)}/${m.terminaEm.slice(0, 4)}` : null,
      ].filter(Boolean);
      linhas.push(`- "${p.name}": ${partes.join("; ")}`);
      const { modulos } = tempoPorModulo(p, sessoes, estado.taskTimeEntries);
      for (const mod of modulos) {
        linhas.push(`  · módulo "${mod.name}": ${fmtHorasMin(Math.round(mod.feitoSeg / 60))} feitos${mod.estimadoMin ? ` de ${fmtHorasMin(mod.estimadoMin)} estimados` : ""}`);
      }
    }
  }

  linhas.push(manutencao(estado, hoje));
  linhas.push(dispensa(estado, hoje));
  linhas.push(anotacoes(estado));
  linhas.push(cruzamentosDosPeriodos(estado, hoje, "blocos"));
  linhas.push(novidadesDoFaro(hoje));
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

  // Tempo de ESTUDO por dia: cronômetro das tarefas que pertencem a um plano de estudo.
  const tarefasDeEstudo = new Set(estado.tasks.filter((t) => !t.deletedAt && t.studyPlanId).map((t) => t.id));
  const estudoPorDia = new Map<string, number>();
  for (const e of estado.taskTimeEntries) {
    if (tarefasDeEstudo.has(e.taskId)) estudoPorDia.set(e.date, (estudoPorDia.get(e.date) ?? 0) + e.seconds);
  }

  // Só a aba HÁBITOS (Leitura, Gratidão, Crossfit, Corrida...). Os blocos fixos do dia a dia (piscina, deslocamento...)
  // ficam de fora daqui e vão em seção própria no fim do resumo, para quando ele perguntar.
  const rotinas = estado.habits;

  const linhas = [
    `\nPANORAMA DOS ÚLTIMOS ${dias} DIAS (um dia por linha; "—" = não anotado; "marcou" = hábitos marcados no dia,` +
      `ex. leitura, gratidão, exercício; "estudo" = tempo cronometrado em planos de estudo):`,
  ];
  for (let i = 0; i < dias; i++) {
    const iso = isoAddDays(hoje, -i);
    const log = estado.dailyLogs[iso];
    const sono = duracaoDoSonoMin(log?.sleptAt ?? null, log?.wokeAt ?? null);
    const horas = (segundosPorDia.get(iso) ?? 0) / 3600;
    const estudoMin = Math.round((estudoPorDia.get(iso) ?? 0) / 60);
    const marcados = rotinas.filter((r) => r.logs[iso]?.checked === true).map((r) => r.name);
    const partes = [
      `${feitasPorDia.get(iso) ?? 0} tarefas concluídas`,
      horas > 0 ? `${horas.toFixed(1).replace(".", ",")}h cronometradas` : "sem cronômetro",
      `estudo ${estudoMin > 0 ? fmtHorasMin(estudoMin) : "—"}`,
      `humor ${log?.mood === null || log?.mood === undefined ? "—" : log.mood === 0 ? "doente" : log.mood}`,
      `sono ${sono === null ? "—" : fmtHorasMin(sono)}`,
      `água ${log && log.waterMl > 0 ? log.waterMl + "ml" : "—"}`,
      `dieta ${log?.dietPct === null || log?.dietPct === undefined ? "—" : log.dietPct + "%"}`,
      `marcou: ${marcados.join(", ") || "nada"}`,
    ];
    linhas.push(`${dataBr(iso)} (${DIAS[dateFromISO(iso).getDay()].slice(0, 3)}): ${partes.join(", ")}`);
  }

  // Visão de 30 dias: quantos dias cada hábito/bloco foi marcado (para ver constância, não só os últimos dias).
  const janela = 30;
  if (rotinas.length) {
    const contagem = rotinas.map((r) => {
      let n = 0;
      for (let i = 0; i < janela; i++) if (r.logs[isoAddDays(hoje, -i)]?.checked === true) n++;
      return `${r.name} ${n}/${janela}`;
    });
    linhas.push(`DIAS MARCADOS NOS ÚLTIMOS ${janela} DIAS: ${contagem.join("; ")}.`);
  }
  return linhas.join("\n");
}

const num = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/**
 * Cruzamentos já calculados (a conta é do código, não da IA): para cada período, o total e, para cada hábito/bloco da rotina
 * (Leitura, Gratidão, Crossfit...), como foram tarefas, cronômetro, humor e sono nos dias COM e SEM a marca.
 * Hoje fica de fora (o dia ainda está aberto). Só entra o que tem ao menos 3 dias de cada lado.
 */
export function cruzamentosDosPeriodos(estado: Estado, hoje: string, so: "habitos" | "blocos" = "habitos"): string {
  const feitas = new Map<string, number>();
  for (const t of estado.tasks) if (t.done && t.date && !t.deletedAt) feitas.set(t.date, (feitas.get(t.date) ?? 0) + 1);
  const seg = new Map<string, number>();
  for (const e of estado.taskTimeEntries) seg.set(e.date, (seg.get(e.date) ?? 0) + e.seconds);
  const rotinas = so === "habitos" ? estado.habits : estado.fixedBlocks;
  if (!rotinas.length) return "";

  const dia = (iso: string) => {
    const log = estado.dailyLogs[iso];
    const sono = duracaoDoSonoMin(log?.sleptAt ?? null, log?.wokeAt ?? null);
    const mood = log?.mood ?? null;
    return {
      iso,
      tarefas: feitas.get(iso) ?? 0,
      horas: (seg.get(iso) ?? 0) / 3600,
      humor: mood !== null && mood > 0 ? mood : null,
      sono,
    };
  };

  const periodos: { nome: string; dias: number }[] = [];
  const diaDoMes = Number(hoje.slice(8, 10));
  if (so === "habitos") {
    if (diaDoMes - 1 >= 3) periodos.push({ nome: "ESTE MÊS", dias: diaDoMes - 1 });
    periodos.push({ nome: "ÚLTIMOS 30 DIAS", dias: 30 }, { nome: "ÚLTIMOS 90 DIAS", dias: 90 });
  } else {
    periodos.push({ nome: "ÚLTIMOS 30 DIAS", dias: 30 });
  }

  const saida = [
    so === "blocos"
      ? "\nCRUZAMENTOS DOS BLOCOS FIXOS DA ROTINA (piscina, deslocamento etc.; use SÓ se ele perguntar pelos blocos; \"com\" = marcado, \"sem\" = não marcado; 3+ dias de cada lado):"
      : "\nCRUZAMENTOS POR PERÍODO (já calculados; hoje fora; \"com\" = dias em que o hábito foi marcado, \"sem\" = dias em que não foi; só afirme relação se houver 3+ dias de cada lado e a diferença for clara):",
  ];
  for (const per of periodos) {
    const lista = [];
    for (let i = 1; i <= per.dias; i++) lista.push(dia(isoAddDays(hoje, -i)));
    const total = lista.reduce((a, d) => a + d.tarefas, 0);
    const comCron = lista.filter((d) => d.horas > 0);
    const hm = media(lista.map((d) => d.humor).filter((x): x is number => x !== null));
    const sm = media(lista.map((d) => d.sono).filter((x): x is number => x !== null));
    saida.push(
      `${per.nome} (${dataBr(lista[lista.length - 1].iso)} a ${dataBr(lista[0].iso)}, ${lista.length} dias): ${total} tarefas concluídas (${num(total / lista.length)} por dia); ` +
        `cronômetro médio ${comCron.length ? num(media(comCron.map((d) => d.horas)) ?? 0) + "h nos " + comCron.length + " dias com cronômetro" : "sem registro"}; ` +
        `humor médio ${hm === null ? "—" : num(hm)}; sono médio ${sm === null ? "—" : fmtHorasMin(Math.round(sm))}.`
    );
    const comparar = (rotulo: string, com: ReturnType<typeof dia>[], sem: ReturnType<typeof dia>[]) => {
      if (com.length < 3 || sem.length < 3) return;
      const par = (f: (d: ReturnType<typeof dia>) => number | null, c = 1) => {
        const a = media(com.map(f).filter((x): x is number => x !== null));
        const b = media(sem.map(f).filter((x): x is number => x !== null));
        return a === null || b === null ? null : `${num(a, c)} com vs ${num(b, c)} sem`;
      };
      const partes = [
        `tarefas/dia ${par((d) => d.tarefas)}`,
        par((d) => d.humor) ? `humor ${par((d) => d.humor)}` : null,
        par((d) => (d.horas > 0 ? d.horas : null)) ? `cronômetro (h) ${par((d) => (d.horas > 0 ? d.horas : null))}` : null,
      ].filter(Boolean);
      saida.push(`  · ${rotulo}: ${com.length} dias com, ${sem.length} sem | ${partes.join(" | ")}`);
    };
    for (const r of rotinas) {
      const com = lista.filter((d) => r.logs[d.iso]?.checked === true);
      comparar(r.name, com, lista.filter((d) => r.logs[d.iso]?.checked !== true));
    }
    if (so === "habitos") {
      const comSono = lista.filter((d) => d.sono !== null);
      comparar("Dormiu 7h ou mais", comSono.filter((d) => (d.sono ?? 0) >= 420), comSono.filter((d) => (d.sono ?? 0) < 420));
      const estudo = new Set(estado.tasks.filter((t) => !t.deletedAt && t.studyPlanId).map((t) => t.id));
      const diasEstudo = new Set(estado.taskTimeEntries.filter((e) => estudo.has(e.taskId) && e.seconds > 0).map((e) => e.date));
      comparar("Estudou (cronômetro de estudo)", lista.filter((d) => diasEstudo.has(d.iso)), lista.filter((d) => !diasEstudo.has(d.iso)));
    }
  }
  return saida.join("\n");
}

/** Anotações novas (as que ele ainda não revisou), sem as marcadas "só minha". */
function anotacoes(estado: Estado): string {
  const novas = (estado.quickNotes ?? []).filter((n) => n.status === "new" && !n.isPrivate);
  if (!novas.length) return "";
  const linhas = [`\nANOTAÇÕES PARA REVISAR (${novas.length}):`];
  for (const n of novas.slice(-10)) linhas.push(`- ${n.body.replace(/\s+/g, " ").slice(0, 160)}`);
  return linhas.join("\n");
}

/**
 * Dispensa (estoque de casa): o que a pessoa tem, quanto, onde e se está acabando, para responder "tenho X na dispensa?".
 * Remédio e saúde ficam de fora: dado de saúde não vai para a IA.
 */
function dispensa(estado: Estado, hoje: string): string {
  const itens = (estado.pantryItems ?? []).filter((i) => !ehRemedioOuSaude(i));
  if (!itens.length) return "";
  const linhas = ["\nDISPENSA (o que a pessoa tem em casa; nomes exatos):"];
  for (const i of itens.slice(0, 80)) {
    const partes = [`${i.quantity}${i.unit ? " " + i.unit : ""}`];
    if (i.status === "low") partes.push("ACABANDO, vale comprar mais");
    else if (i.status === "out" || i.quantity <= 0) partes.push("ACABOU, precisa comprar");
    else partes.push("tem");
    if (i.place) partes.push(`guardado em: ${i.place}`);
    const val = situacaoDaValidade(i, hoje);
    if (i.expiresOn) partes.push(val?.tipo === "vencido" ? `VENCIDO há ${-val.dias} dia(s)` : val ? `vence em ${dataBr(i.expiresOn)} (faltam ${val.dias} dia(s))` : `validade ${dataBr(i.expiresOn)}`);
    // Média de uso (do histórico de mudanças): só quando já há dados para calcular.
    const uso = mediaDeUso(i, (estado.pantryUsage ?? []).filter((u) => u.itemId === i.id), hoje);
    if (uso?.pronta) partes.push(`média de uso: gasta ${fmtRitmo(uso, i.unit)}; ${i.unit === "%" ? "um frasco" : "do cheio ao fim"} dura ${fmtTempo(uso.duracaoDoCheioDias)}${uso.acabaEm ? `; no ritmo atual acaba por volta de ${dataBr(uso.acabaEm)}` : ""}`);
    if (i.forSale) partes.push("para vender");
    linhas.push(`- ${i.name}${i.category ? ` (${i.category})` : ""}: ${partes.join("; ")}`);
  }
  return linhas.join("\n");
}

/** Manutenção (casa, carro...): cada item com o ciclo atual e os dias que faltam, para responder "quanto falta para...". */
function manutencao(estado: Estado, hoje: string): string {
  const itens = (estado.maintenanceItems ?? []).filter((i) => i.active);
  const bens = estado.maintenanceAssets ?? [];
  if (!itens.length && !bens.length) return "";
  const linhas = [`\nBENS DA MANUTENÇÃO (use um destes nomes ao cadastrar item novo): ${bens.map((b) => b.name).join("; ") || "nenhum ainda"}`];
  if (!itens.length) return linhas.join("\n");
  linhas.push("MANUTENÇÃO (cada item: ciclo atual e quanto falta; nomes exatos):");
  for (const item of itens.slice(0, 40)) {
    const bem = (estado.maintenanceAssets ?? []).find((a) => a.id === item.assetId);
    if (!bem) continue;
    const leituras = (estado.odometerReadings ?? []).filter((r) => r.assetId === bem.id);
    const st = maintenanceStatus(item, bem, leituras, hoje);
    const servicos = (estado.maintenanceServices ?? []).filter((s) => s.itemId === item.id);
    const { atual } = ciclosDoItem(item, servicos, st.dueDate);
    let situacao: string;
    if (item.waiting) situacao = "aguardando começar (nada conta ainda)";
    else if (st.state === "sem_base") situacao = "nunca registrado";
    else {
      const partes: string[] = [];
      if (st.dueDate) {
        const dias = diasEntre(st.dueDate, hoje);
        partes.push(dias < 0 ? `VENCIDO há ${-dias} dia(s) (venceu ${dataBr(st.dueDate)})` : `vence em ${dataBr(st.dueDate)} (faltam ${dias} dia(s))`);
      }
      if (st.distanceLeft !== null) partes.push(st.distanceLeft > 0 ? `faltam ${st.distanceLeft} ${bem.odometerUnit}` : `passou ${-st.distanceLeft} ${bem.odometerUnit}`);
      situacao = partes.join("; ") || "sem intervalo definido";
    }
    linhas.push(`- ${item.name} (${bem.name}): Ciclo ${atual.n}${atual.inicio ? `, começou em ${dataBr(atual.inicio)}` : ""}; ${situacao}`);
  }
  return linhas.join("\n");
}
