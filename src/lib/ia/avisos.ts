import { isFeatureEnabled, type BoardState } from "@/lib/types";

/**
 * Quando o FARO te puxa sozinho no meio do dia.
 *
 * QUEM DECIDE É REGRA FIXA, não a IA: sem custo de API para decidir "é hora de
 * perguntar", e o resultado é previsível. A IA só entra quando ele toca em
 * "Ajudar". Limites que ele pediu para não virar incômodo: no máximo 2 avisos por
 * dia, um assunto por vez, nunca antes das 9h nem depois das 22h, e pelo menos
 * 2 horas entre um e outro.
 *
 * Só funciona com o app aberto (é um balão na tela, não uma notificação).
 */

export const MAX_AVISOS_POR_DIA = 2;
export const INTERVALO_MINIMO_MS = 2 * 3600 * 1000;
const HORA_INICIAL = 9;
const HORA_FINAL = 22;

export type AcaoDoBotao =
  | { tipo: "humor"; nivel: 1 | 2 | 3 | 4 | 5 }
  | { tipo: "perguntar"; texto: string }
  | { tipo: "ver_registro" }
  | { tipo: "fechar" };

export interface AvisoDoFaro {
  /** Um assunto por dia: o id vai para a lista de "já mostrei hoje". */
  id: "humor" | "registro" | "atrasadas" | "vencidos" | "habitos";
  texto: string;
  /** Escala de humor em vez de botões comuns. */
  escalaDeHumor?: boolean;
  botoes: { rotulo: string; acao: AcaoDoBotao }[];
}

type Estado = Pick<BoardState, "tasks" | "reminders" | "habits" | "dailyLogs"> & {
  settings: Pick<BoardState["settings"], "featureFlags">;
};

export interface Historico {
  /** Ids já mostrados hoje. */
  ids: string[];
  /** Quando foi o último, em ms desde 1970; 0 se nenhum. */
  ultimoEm: number;
}

const lista = (itens: string[], max = 3) =>
  itens.slice(0, max).join(", ") + (itens.length > max ? ` e mais ${itens.length - max}` : "");

export function avisoDaVez(estado: Estado, agora: Date, hoje: string, historico: Historico): AvisoDoFaro | null {
  const hora = agora.getHours();
  if (hora < HORA_INICIAL || hora >= HORA_FINAL) return null;
  if (historico.ids.length >= MAX_AVISOS_POR_DIA) return null;
  if (historico.ultimoEm && agora.getTime() - historico.ultimoEm < INTERVALO_MINIMO_MS) return null;
  const jaFoi = (id: string) => historico.ids.includes(id);

  const flags = estado.settings.featureFlags;
  const log = estado.dailyLogs[hoje];

  // 1) Como você está? A pergunta que ele pediu para o meio do dia.
  if (hora >= 14 && !jaFoi("humor") && isFeatureEnabled(flags, "mood") && (log?.mood === null || log?.mood === undefined)) {
    return {
      id: "humor",
      texto: "Como você está se sentindo hoje?",
      escalaDeHumor: true,
      botoes: [{ rotulo: "Agora não", acao: { tipo: "fechar" } }],
    };
  }

  // 2) O que ficou sem anotar no registro do dia (só à noite, quando já dá para fechar o dia).
  if (hora >= 19 && !jaFoi("registro")) {
    const faltas: string[] = [];
    if (isFeatureEnabled(flags, "sleep") && !log?.wokeAt) faltas.push("a hora que acordou");
    if (isFeatureEnabled(flags, "sleep") && !log?.sleptAt) faltas.push("a hora de dormir");
    if (isFeatureEnabled(flags, "diet") && (log?.dietPct === null || log?.dietPct === undefined)) faltas.push("a % da dieta");
    if (isFeatureEnabled(flags, "water") && !(log?.waterMl && log.waterMl > 0)) faltas.push("a água");
    if (faltas.length) {
      return {
        id: "registro",
        texto: `Faltou anotar hoje: ${lista(faltas, 4)}. Quer dizer agora?`,
        botoes: [
          { rotulo: "Dizer por voz ou texto", acao: { tipo: "perguntar", texto: "" } },
          { rotulo: "Ver o registro do dia", acao: { tipo: "ver_registro" } },
          { rotulo: "Depois", acao: { tipo: "fechar" } },
        ],
      };
    }
  }

  // 3) Tarefas que ficaram para trás.
  const atrasadas = estado.tasks.filter((t) => !t.deletedAt && !t.done && t.date && t.date < hoje);
  if (hora >= 10 && !jaFoi("atrasadas") && atrasadas.length >= 3) {
    return {
      id: "atrasadas",
      texto: `${atrasadas.length} tarefas estão atrasadas. Quer ajuda para decidir o que fazer com elas?`,
      botoes: [
        { rotulo: "Ajudar", acao: { tipo: "perguntar", texto: "Me ajuda a decidir o que fazer com as tarefas atrasadas." } },
        { rotulo: "Depois", acao: { tipo: "fechar" } },
      ],
    };
  }

  // 4) Lembretes que venceram sem baixa (remédio e dieta ficam de fora).
  const vencidos = estado.reminders.filter(
    (r) => !r.deletedAt && !r.done && r.date && r.date <= hoje && (r.date < hoje || (r.time ?? "99:99") < horaLocal(agora)) &&
      r.sourceKind !== "medication" && r.sourceKind !== "diet_meal"
  );
  if (hora >= 11 && !jaFoi("vencidos") && vencidos.length >= 1) {
    return {
      id: "vencidos",
      texto: `Lembrete${vencidos.length > 1 ? "s" : ""} vencido${vencidos.length > 1 ? "s" : ""} sem baixa: ${lista(vencidos.map((r) => r.title), 3)}.`,
      botoes: [
        { rotulo: "O que faço com isso?", acao: { tipo: "perguntar", texto: "O que eu faço com os lembretes vencidos?" } },
        { rotulo: "Ok", acao: { tipo: "fechar" } },
      ],
    };
  }

  // 5) Hábitos de hoje ainda não feitos, no fim da tarde.
  const faltamHabitos = estado.habits.filter((h) => !h.logs[hoje]?.checked).map((h) => h.name);
  if (hora >= 17 && !jaFoi("habitos") && estado.habits.length > 0 && faltamHabitos.length > 0) {
    return {
      id: "habitos",
      texto: `Hábitos de hoje que faltam: ${lista(faltamHabitos, 4)}.`,
      botoes: [{ rotulo: "Ok", acao: { tipo: "fechar" } }],
    };
  }
  return null;
}

function horaLocal(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** A chave do "já mostrei hoje" no armazenamento do navegador. */
export const chaveDosAvisos = (hoje: string) => `faro-avisos-${hoje}`;

export function lerHistorico(bruto: string | null): Historico {
  try {
    const o = JSON.parse(bruto ?? "null") as Partial<Historico> | null;
    return {
      ids: Array.isArray(o?.ids) ? o.ids.filter((x): x is string => typeof x === "string") : [],
      ultimoEm: typeof o?.ultimoEm === "number" ? o.ultimoEm : 0,
    };
  } catch {
    return { ids: [], ultimoEm: 0 };
  }
}

