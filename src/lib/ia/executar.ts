import type { Checklist, ChecklistExpense, DailyLog, Priority } from "@/lib/types";
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
  updateDailyLog: (data: string, patch: Partial<DailyLog>) => void;
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
    case "registrar_humor":
      return { nivel: a.nivel, emocao: a.emocao ?? undefined };
    case "registrar_sono":
      return { dormiu: a.dormiu ?? undefined, acordou: a.acordou ?? undefined };
    case "registrar_agua":
      return { ml: a.ml };
    case "registrar_dieta":
      return { percentual: a.percentual };
  }
}

export { descreverAcao };
