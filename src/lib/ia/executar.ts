import type { Birthday, Checklist, ChecklistExpense, DailyLog, PantryItem, Priority, Reminder, StudyPlan, Task, TaskStatus } from "@/lib/types";
import { acharUmItemPeloNome, aposComprar, ehRemedioOuSaude, lembreteDeCompraPendente } from "@/lib/board/dispensa";
import { descreverAcao, validarAcao, type AcaoProposta } from "./ferramentas";

/**
 * Grava no app o que a IA propôs e ele confirmou. Recebe só as funções de que
 * precisa (o `board`), então dá para testar com um quadro de mentira.
 *
 * Revalida tudo: o que veio do servidor passou por validarAcao, mas a tela é a
 * última porta antes do banco e não confia em ninguém.
 */
export interface QuadroParaAcoes {
  checklists: Checklist[];
  addReminder: (titulo: string, data: string | null, hora: string | null) => Promise<boolean>;
  addTask: (
    data: string,
    titulo: string,
    extras?: { time?: string; priority?: Priority; note?: string }
  ) => Promise<boolean>;
  updateChecklist: (id: string, patch: { expenses: ChecklistExpense[] }) => void;
  tasks: Task[];
  taskStatuses: TaskStatus[];
  setTaskStatus: (id: string, statusId: string) => void;
  addMeeting: (campos: { title: string; client: string | null; date: string; time: string | null }) => string | null;
  updateTaskNote: (id: string, note: string) => void;
  birthdays: Birthday[];
  addBirthday: (campos: Pick<Birthday, "name" | "month" | "day" | "year" | "category">) => Promise<string | null>;
  updateBirthday: (id: string, patch: Partial<Birthday>) => void;
  updateDailyLog: (data: string, patch: Partial<DailyLog>) => void;
  studyPlans: StudyPlan[];
  updateStudyPlan: (id: string, patch: Partial<StudyPlan>) => void;
  generateStudySessions: (planId: string) => Promise<number>;
  pantryItems: PantryItem[];
  addPantryItem: (name: string, extra?: Partial<Omit<PantryItem, "id" | "name">>) => void;
  addQuickNote: (body: string, extra?: { tag?: string }) => string | null;
  updatePantryItem: (id: string, patch: Partial<Omit<PantryItem, "id">>) => void;
  reminders: Reminder[];
  completeReminder: (id: string) => void;
  /** O registro de hoje, para somar água em cima do que já tem. */
  logDeHoje: DailyLog | undefined;
}

export interface ResultadoDaExecucao {
  ok: boolean;
  mensagem: string;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Acha o checklist pelo nome (sem ligar para acento ou maiúscula), só entre os que têm Gastos ligado. */
export function acharChecklistDeGastos(checklists: Checklist[], nome: string): Checklist | null {
  const alvo = semAcento(nome);
  const candidatos = checklists.filter((c) => c.expensesEnabled);
  return (
    candidatos.find((c) => semAcento(c.title) === alvo) ??
    candidatos.find((c) => semAcento(c.title).includes(alvo) || alvo.includes(semAcento(c.title))) ??
    null
  );
}

/**
 * Acha a tarefa pelo título (sem ligar para acento ou maiúscula). Dá a resposta
 * certa quando não acha ou quando há mais de uma: a IA nunca "adivinha" qual
 * tarefa marcar, porque marcar a errada é pior do que perguntar.
 */
export function acharTarefa(
  tarefas: Task[],
  titulo: string,
  data: string | null,
  soAbertas: boolean
): { tarefa: Task } | { erro: string } {
  const alvo = semAcento(titulo);
  const vivas = tarefas.filter((t) => !t.deletedAt && (!soAbertas || !t.done));
  const exatas = vivas.filter((t) => semAcento(t.title) === alvo);
  let achadas = exatas.length ? exatas : vivas.filter((t) => semAcento(t.title).includes(alvo) || alvo.includes(semAcento(t.title)));
  if (data && achadas.length > 1) {
    const naData = achadas.filter((t) => t.date === data);
    if (naData.length) achadas = naData;
  }
  if (!achadas.length) return { erro: `Não achei a tarefa "${titulo}"${soAbertas ? " em aberto" : ""}.` };
  if (achadas.length > 1) {
    const exemplos = achadas
      .slice(0, 4)
      .map((t) => `"${t.title}"${t.date ? ` (${t.date.split("-").reverse().join("/")})` : ""}`)
      .join(", ");
    return { erro: `Achei mais de uma (${exemplos}). Diga qual, com a data.` };
  }
  return { tarefa: achadas[0] };
}

const escaparHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function executarAcao(acaoBruta: AcaoProposta, quadro: QuadroParaAcoes, hoje: string): Promise<ResultadoDaExecucao> {
  const v = validarAcao(acaoBruta.tipo, converterParaEntrada(acaoBruta));
  if (!v.ok) return { ok: false, mensagem: `Não gravei: ${v.motivo}.` };
  const acao = v.acao;

  switch (acao.tipo) {
    case "criar_lembrete": {
      const ok = await quadro.addReminder(acao.titulo, acao.data, acao.hora);
      return ok ? { ok: true, mensagem: "Lembrete criado." } : { ok: false, mensagem: "Não consegui criar o lembrete." };
    }
    case "criar_tarefa": {
      const ok = await quadro.addTask(acao.data ?? "", acao.titulo, {
        time: acao.hora ?? undefined,
        priority: acao.prioridade ?? undefined,
        note: acao.observacao ?? undefined,
      });
      return ok ? { ok: true, mensagem: "Tarefa criada." } : { ok: false, mensagem: "Não consegui criar a tarefa." };
    }
    case "anotar_gasto": {
      const lista = acharChecklistDeGastos(quadro.checklists, acao.checklist);
      if (!lista) {
        const ligados = quadro.checklists.filter((c) => c.expensesEnabled).map((c) => c.title);
        return {
          ok: false,
          mensagem: `Não achei o checklist "${acao.checklist}" com a aba Gastos ligada.${ligados.length ? ` Com Gastos: ${ligados.join(", ")}.` : " Nenhum checklist tem Gastos ligado ainda."}`,
        };
      }
      const gasto: ChecklistExpense = {
        id: crypto.randomUUID(),
        label: acao.descricao,
        amountCents: acao.valorCentavos,
        date: acao.data ?? hoje,
      };
      quadro.updateChecklist(lista.id, { expenses: [...lista.expenses, gasto] });
      return { ok: true, mensagem: `Gasto anotado em "${lista.title}".` };
    }
    case "adicionar_aniversario": {
      // Mesmo nome (sem contar acento ou maiúscula) já está na lista: não duplica.
      if (quadro.birthdays.some((b) => semAcento(b.name) === semAcento(acao.nome))) {
        return { ok: false, mensagem: `"${acao.nome}" já está na lista de aniversários.` };
      }
      const id = await quadro.addBirthday({ name: acao.nome, month: acao.mes, day: acao.dia, year: acao.ano, category: acao.categoria });
      if (!id) return { ok: false, mensagem: "Não consegui adicionar o aniversário." };
      if (acao.telefone) quadro.updateBirthday(id, { phone: acao.telefone });
      if (acao.lembrarNoWhatsapp) quadro.updateBirthday(id, { remind: true, remindWhatsapp: true });
      return {
        ok: true,
        mensagem: `${acao.nome} entrou na lista de aniversários, com lembrete às 9h${acao.lembrarNoWhatsapp ? " e no WhatsApp" : ""}.`,
      };
    }
    case "lembrete_de_aniversario": {
      const alvo = semAcento(acao.nome);
      const pessoa =
        quadro.birthdays.find((b) => semAcento(b.name) === alvo) ??
        quadro.birthdays.find((b) => semAcento(b.name).includes(alvo) || alvo.includes(semAcento(b.name)));
      if (!pessoa) return { ok: false, mensagem: `Não achei "${acao.nome}" na lista de aniversários.` };
      // Zap exige o lembrete ligado; sem lembrete, não há o que mandar no WhatsApp.
      const whatsapp = acao.lembrar === false ? false : acao.whatsapp;
      const lembrar = whatsapp === true ? true : acao.lembrar;
      quadro.updateBirthday(pessoa.id, {
        ...(lembrar !== null ? { remind: lembrar } : {}),
        ...(whatsapp !== null ? { remindWhatsapp: whatsapp } : {}),
      });
      const estado = [
        lembrar === null ? null : `lembrete ${lembrar ? "ligado" : "desligado"}`,
        whatsapp === null ? null : `WhatsApp ${whatsapp ? "ligado" : "desligado"}`,
      ].filter(Boolean);
      return { ok: true, mensagem: `${pessoa.name}: ${estado.join(", ")}.` };
    }
    case "marcar_tarefa_feita": {
      const r = acharTarefa(quadro.tasks, acao.titulo, acao.data, true);
      if ("erro" in r) return { ok: false, mensagem: r.erro };
      const feito = quadro.taskStatuses.find((s) => s.isDone);
      if (!feito) return { ok: false, mensagem: "Não achei o status de concluído." };
      quadro.setTaskStatus(r.tarefa.id, feito.id);
      return { ok: true, mensagem: `"${r.tarefa.title}" marcada como feita.` };
    }
    case "criar_reuniao": {
      const id = quadro.addMeeting({ title: acao.titulo, client: acao.cliente, date: acao.data, time: acao.hora });
      return id ? { ok: true, mensagem: "Reunião criada." } : { ok: false, mensagem: "Não consegui criar a reunião." };
    }
    case "anotar_em_tarefa": {
      const r = acharTarefa(quadro.tasks, acao.titulo, acao.data, false);
      if ("erro" in r) return { ok: false, mensagem: r.erro };
      // Só acrescenta: o que já estava escrito fica exatamente como está.
      const novo = `<p>${escaparHtml(acao.texto).replace(/\n/g, "<br>")}</p>`;
      quadro.updateTaskNote(r.tarefa.id, `${r.tarefa.note ?? ""}${novo}`);
      return { ok: true, mensagem: `Anotação acrescentada em "${r.tarefa.title}".` };
    }
    case "registrar_humor": {
      quadro.updateDailyLog(hoje, { mood: acao.nivel, ...(acao.emocao ? { moodEmotion: acao.emocao } : {}) });
      return { ok: true, mensagem: "Humor de hoje registrado." };
    }
    case "registrar_sono": {
      quadro.updateDailyLog(hoje, {
        ...(acao.acordou ? { wokeAt: acao.acordou } : {}),
        ...(acao.dormiu ? { sleptAt: acao.dormiu } : {}),
      });
      return { ok: true, mensagem: "Sono de hoje registrado." };
    }
    case "registrar_agua": {
      const atual = quadro.logDeHoje?.waterMl ?? 0;
      quadro.updateDailyLog(hoje, { waterMl: atual + acao.ml });
      return { ok: true, mensagem: `Água somada: ${atual + acao.ml} ml hoje.` };
    }
    case "registrar_dieta": {
      quadro.updateDailyLog(hoje, { dietPct: acao.percentual });
      return { ok: true, mensagem: "Dieta de hoje registrada." };
    }
    case "repor_dispensa": {
      // Remédio e saúde nunca passam pela IA: não repõe por aqui.
      const candidatos = quadro.pantryItems.filter((i) => !ehRemedioOuSaude(i));
      const item = acharUmItemPeloNome(candidatos, acao.item);
      if (!item) return { ok: false, mensagem: `Não achei "${acao.item}" na dispensa (ou há mais de um parecido). Abra a Dispensa para ajustar.` };
      quadro.updatePantryItem(item.id, aposComprar(item, acao.quantidade));
      const lembrete = lembreteDeCompraPendente(quadro.reminders, item.name);
      if (lembrete) quadro.completeReminder(lembrete.id);
      return { ok: true, mensagem: `"${item.name}" voltou para a dispensa${lembrete ? " e o lembrete de compra foi concluído" : ""}.` };
    }
    case "anotar": {
      const id = quadro.addQuickNote(acao.texto, { tag: acao.etiqueta ?? undefined });
      return id ? { ok: true, mensagem: "Guardei em Anotações, para você revisar depois." } : { ok: false, mensagem: "Não consegui guardar a anotação." };
    }
    case "adicionar_na_dispensa": {
      let criados = 0;
      const jaTinha: string[] = [];
      for (const i of acao.itens) {
        if (acharUmItemPeloNome(quadro.pantryItems, i.nome)?.name.toLowerCase() === i.nome.toLowerCase()) {
          jaTinha.push(i.nome);
          continue;
        }
        quadro.addPantryItem(i.nome, {
          quantity: i.quantidade,
          unit: i.unidade,
          place: i.onde,
          category: i.categoria,
          status: i.situacao,
          expiresOn: i.validade,
        });
        criados++;
      }
      const resto = jaTinha.length ? ` Já estavam lá: ${jaTinha.join(", ")}.` : "";
      return criados > 0 ? { ok: true, mensagem: `${criados} ${criados === 1 ? "item entrou" : "itens entraram"} na Dispensa.${resto}` } : { ok: false, mensagem: `Nada novo para a Dispensa.${resto}` };
    }
    case "ajustar_plano_de_estudo": {
      const alvo = semAcento(acao.plano);
      const plano =
        quadro.studyPlans.find((p) => semAcento(p.name) === alvo) ??
        quadro.studyPlans.find((p) => semAcento(p.name).includes(alvo) || alvo.includes(semAcento(p.name)));
      if (!plano) return { ok: false, mensagem: `Não achei o plano de estudo "${acao.plano}".` };
      const patch: Partial<StudyPlan> = {};
      if (acao.horasTotais !== null) patch.totalMinutes = Math.round(acao.horasTotais * 60);
      if (acao.minutosPorSessao !== null) patch.sessionMinutes = acao.minutosPorSessao;
      if (acao.prazo) patch.deadline = acao.prazo;
      if (acao.diasDaSemana) patch.weekDays = acao.diasDaSemana;
      quadro.updateStudyPlan(plano.id, patch);
      if (!acao.redistribuir) return { ok: true, mensagem: `Plano "${plano.name}" ajustado.` };
      // As sessões feitas e o tempo registrado ficam: só o que ainda não foi feito é refeito.
      const n = await quadro.generateStudySessions(plano.id);
      return { ok: true, mensagem: `Plano "${plano.name}" ajustado${n > 0 ? `; ${n} sessões futuras refeitas na agenda` : ""}.` };
    }
  }
}

/** A ação já validada volta ao formato de entrada da ferramenta, para passar de novo pelo mesmo validador. */
function converterParaEntrada(a: AcaoProposta): Record<string, unknown> {
  switch (a.tipo) {
    case "criar_lembrete":
      return { titulo: a.titulo, data: a.data, hora: a.hora, observacao: a.observacao ?? undefined };
    case "criar_tarefa":
      return { titulo: a.titulo, data: a.data ?? undefined, hora: a.hora ?? undefined, prioridade: a.prioridade ?? undefined, observacao: a.observacao ?? undefined };
    case "anotar_gasto":
      return { checklist: a.checklist, descricao: a.descricao, valor_reais: a.valorCentavos / 100, data: a.data ?? undefined };
    case "adicionar_aniversario":
      return {
        nome: a.nome,
        dia: a.dia,
        mes: a.mes,
        ano: a.ano ?? undefined,
        categoria: a.categoria,
        telefone: a.telefone ?? undefined,
        lembrar_no_whatsapp: a.lembrarNoWhatsapp,
      };
    case "lembrete_de_aniversario":
      return { nome: a.nome, lembrar: a.lembrar ?? undefined, whatsapp: a.whatsapp ?? undefined };
    case "marcar_tarefa_feita":
      return { titulo: a.titulo, data: a.data ?? undefined };
    case "criar_reuniao":
      return { titulo: a.titulo, cliente: a.cliente ?? undefined, data: a.data, hora: a.hora ?? undefined };
    case "anotar_em_tarefa":
      return { titulo: a.titulo, data: a.data ?? undefined, texto: a.texto };
    case "registrar_humor":
      return { nivel: a.nivel, emocao: a.emocao ?? undefined };
    case "registrar_sono":
      return { dormiu: a.dormiu ?? undefined, acordou: a.acordou ?? undefined };
    case "registrar_agua":
      return { ml: a.ml };
    case "registrar_dieta":
      return { percentual: a.percentual };
    case "repor_dispensa":
      return { item: a.item, quantidade: a.quantidade ?? undefined };
    case "anotar":
      return { texto: a.texto, etiqueta: a.etiqueta ?? undefined };
    case "adicionar_na_dispensa":
      return {
        itens: a.itens.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade,
          unidade: i.unidade || undefined,
          onde: i.onde || undefined,
          categoria: i.categoria || undefined,
          situacao: i.situacao,
          validade: i.validade ?? undefined,
        })),
      };
    case "ajustar_plano_de_estudo":
      return {
        plano: a.plano,
        horas_totais: a.horasTotais ?? undefined,
        minutos_por_sessao: a.minutosPorSessao ?? undefined,
        prazo: a.prazo ?? undefined,
        dias_da_semana: a.diasDaSemana ?? undefined,
        redistribuir: a.redistribuir,
      };
  }
}

export { descreverAcao };
