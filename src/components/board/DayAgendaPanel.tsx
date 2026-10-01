"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { isMeetingTask } from "@/lib/types";
import { DAY_NAMES, MONTH_NAMES, dateFromISO, isoFromDate, todayISO } from "@/lib/date-utils";

type Marca = "reuniao" | "tarefa" | "lembrete";
type Item = { id: string; dia: string; hora: string; titulo: string; tipo: Marca; feito: boolean };

/**
 * A agenda, em dois modos.
 *
 * Existe por um motivo de layout e um de conteúdo. O de layout: o painel de
 * Horas é baixo e o Registro do dia é alto, então sobrava um vão embaixo do
 * Horas — "eu não gosto desse espaço vazio, o layout tem que estar sempre
 * preenchido". O de conteúdo: faltava a leitura do dia em ordem de relógio. A
 * lista de tarefas é ordenada por prioridade e arrastada à mão; os lembretes
 * moram noutra tela. Nenhuma das duas responde "o que vem agora".
 *
 * **Dia** é a linha do tempo de hoje. **Mês** é o calendário com marca nos dias
 * que têm algo — ele pediu pra poder escolher, e as duas perguntas são mesmo
 * diferentes: "o que vem agora" e "como está meu mês".
 */
export function DayAgendaPanel({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
}) {
  const { board } = useBoardCtx();
  const [modo, setModo] = useState<"dia" | "mes">("dia");

  // Um item de agenda é qualquer coisa COM HORÁRIO num dia. Sem hora não há
  // lugar numa linha do tempo, e enfiar no topo ou no fim inventaria uma ordem
  // que ninguém decidiu — isso continua na lista de tarefas, que é onde vive.
  const tarefas: Item[] = board.state.tasks
    .filter((t) => t.date && t.time)
    .map((t) => ({
      id: t.id,
      dia: t.date as string,
      hora: t.time,
      titulo: t.title,
      tipo: isMeetingTask(t) ? "reuniao" : "tarefa",
      feito: t.done,
    }));

  const lembretes: Item[] = board.state.reminders
    .filter((r) => !r.deletedAt && !r.done && r.date && r.time)
    .map((r) => ({
      id: r.id,
      dia: r.date as string,
      hora: r.time as string,
      titulo: r.title,
      tipo: "lembrete",
      feito: false,
    }));

  const todos = [...tarefas, ...lembretes];
  const doDia = todos
    .filter((i) => i.dia === selectedDate)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const hoje = todayISO();

  return (
    <div className="section agenda-section">
      <div className="section-head agenda-head">
        <span className="section-pill accent">Agenda</span>
        <div className="view-toggle">
          <button
            type="button"
            className={"view-toggle-btn" + (modo === "dia" ? " active" : "")}
            onClick={() => setModo("dia")}
          >
            Dia
          </button>
          <button
            type="button"
            className={"view-toggle-btn" + (modo === "mes" ? " active" : "")}
            onClick={() => setModo("mes")}
          >
            Mês
          </button>
        </div>
      </div>

      <div className="agenda-panel">
        {modo === "dia" ? (
          doDia.length === 0 ? (
            // Vazio aqui é informação, não falha: saber que o dia não tem nada
            // marcado vale tanto quanto ver a lista cheia.
            <div className="agenda-vazio">Nada com horário marcado nesse dia.</div>
          ) : (
            doDia.map((i) => (
              <div className={"agenda-row" + (i.feito ? " feito" : "")} key={`${i.tipo}-${i.id}`}>
                <span className="mono agenda-hora">{i.hora}</span>
                <span className={"agenda-marca " + i.tipo} />
                <span className="agenda-titulo">{i.titulo}</span>
              </div>
            ))
          )
        ) : (
          <MesDaAgenda
            selectedDate={selectedDate}
            hoje={hoje}
            itens={todos}
            onSelectDate={onSelectDate}
          />
        )}
      </div>
    </div>
  );
}

/** O mês do `selectedDate`, começando no domingo, com marca nos dias ocupados. */
function MesDaAgenda({
  selectedDate,
  hoje,
  itens,
  onSelectDate,
}: {
  selectedDate: string;
  hoje: string;
  itens: Item[];
  onSelectDate: (iso: string) => void;
}) {
  const base = dateFromISO(selectedDate);
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  // Quantos quadrados vazios antes do dia 1 — a semana começa no domingo, que é
  // a ordem do DAY_NAMES e da faixa de dias do app.
  const vazios = primeiro.getDay();

  // Quantos itens por dia, calculado uma vez: olhar a lista inteira dentro do
  // laço dos 31 dias seria varrer tudo 31 vezes.
  const porDia = new Map<string, number>();
  for (const i of itens) porDia.set(i.dia, (porDia.get(i.dia) ?? 0) + 1);

  const celulas: (string | null)[] = [
    ...Array<null>(vazios).fill(null),
    ...Array.from({ length: diasNoMes }, (_, k) => isoFromDate(new Date(ano, mes, k + 1))),
  ];

  return (
    <div className="agenda-mes">
      <div className="agenda-mes-titulo">
        {MONTH_NAMES[mes]} de {ano}
      </div>
      <div className="agenda-mes-grade">
        {DAY_NAMES.map((n) => (
          <span className="agenda-mes-cab" key={n}>
            {n[0]}
          </span>
        ))}
        {celulas.map((iso, idx) =>
          iso === null ? (
            <span key={`v${idx}`} />
          ) : (
            <button
              type="button"
              key={iso}
              className={
                "agenda-mes-dia" +
                (iso === selectedDate ? " sel" : "") +
                (iso === hoje ? " hoje" : "")
              }
              title={`${porDia.get(iso) ?? 0} com horário`}
              onClick={() => onSelectDate(iso)}
            >
              {dateFromISO(iso).getDate()}
              {/* Um ponto, não a contagem: o número do dia já ocupa a célula, e
                  dois números juntos num quadrado de 26px não se leem. */}
              {porDia.has(iso) && <span className="agenda-mes-ponto" />}
            </button>
          )
        )}
      </div>
    </div>
  );
}
