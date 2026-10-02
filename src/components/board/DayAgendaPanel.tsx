"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { isMeetingTask, type Task } from "@/lib/types";
import { DAY_NAMES, MONTH_NAMES, dateFromISO, isoFromDate, todayISO } from "@/lib/date-utils";

type Marca = "reuniao" | "tarefa" | "lembrete";
type Item = {
  id: string;
  dia: string;
  hora: string;
  titulo: string;
  tipo: Marca;
  feito: boolean;
  task: Task | null;
};

/**
 * A agenda, em três modos.
 *
 * Existe por um motivo de layout e um de conteúdo. O de layout: o painel de
 * Horas é baixo e o Registro do dia é alto, então sobrava um vão embaixo do
 * Horas — "eu não gosto desse espaço vazio, o layout tem que estar sempre
 * preenchido". O de conteúdo: faltava a leitura do dia em ordem de relógio.
 *
 * - **Dia**: o que tem horário, em ordem de relógio. Responde "o que vem agora".
 * - **Mês**: o calendário com marca nos dias ocupados. Responde "como está meu mês".
 * - **Lembretes**: os lembretes daquele dia, INCLUSIVE os sem horário — que por
 *   definição não cabem numa linha do tempo e some do modo Dia. Ele pediu os
 *   dois botões lado a lado; virou um alternador só de três porque dois
 *   alternadores empilhados num painel estreito é mais controle que conteúdo.
 */
export function DayAgendaPanel({
  selectedDate,
  onSelectDate,
  onAbrirTarefa,
  onAbrirLembrete,
}: {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  onAbrirTarefa: (task: Task) => void;
  onAbrirLembrete: (id: string) => void;
}) {
  const { board } = useBoardCtx();
  const [modo, setModo] = useState<"dia" | "mes" | "lembretes">("dia");

  // Um item de agenda é qualquer coisa COM HORÁRIO num dia. Sem hora não há
  // lugar numa linha do tempo, e enfiar no topo ou no fim inventaria uma ordem
  // que ninguém decidiu — quem precisa desses é o modo Lembretes.
  const tarefas: Item[] = board.state.tasks
    .filter((t) => t.date && t.time)
    .map((t) => ({
      id: t.id,
      dia: t.date as string,
      hora: t.time,
      titulo: t.title,
      tipo: isMeetingTask(t) ? "reuniao" : "tarefa",
      feito: t.done,
      task: t,
    }));

  const lembretesComHora: Item[] = board.state.reminders
    .filter((r) => !r.deletedAt && !r.done && r.date && r.time)
    .map((r) => ({
      id: r.id,
      dia: r.date as string,
      hora: r.time as string,
      titulo: r.title,
      tipo: "lembrete" as const,
      feito: false,
      task: null,
    }));

  const todos = [...tarefas, ...lembretesComHora];
  const doDia = todos
    .filter((i) => i.dia === selectedDate)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // No modo Lembretes entram TODOS os do dia, com hora ou sem. Os sem hora vão
  // pro fim: eles não concorrem com os marcados, mas também não podem sumir.
  const lembretesDoDia = board.state.reminders
    .filter((r) => !r.deletedAt && r.date === selectedDate)
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  const hoje = todayISO();

  return (
    <div className="section agenda-section">
      <div className="section-head agenda-head">
        <span className="section-pill accent">Agenda</span>
        <div className="view-toggle">
          {(
            [
              ["dia", "Dia"],
              ["mes", "Mês"],
              ["lembretes", "Lembretes"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className={"view-toggle-btn" + (modo === valor ? " active" : "")}
              onClick={() => setModo(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="agenda-panel">
        {modo === "dia" &&
          (doDia.length === 0 ? (
            // Vazio aqui é informação, não falha: saber que o dia não tem nada
            // marcado vale tanto quanto ver a lista cheia.
            <div className="agenda-vazio">Nada com horário marcado nesse dia.</div>
          ) : (
            doDia.map((i) => (
              <button
                type="button"
                className={"agenda-row" + (i.feito ? " feito" : "")}
                key={`${i.tipo}-${i.id}`}
                onClick={() => (i.task ? onAbrirTarefa(i.task) : onAbrirLembrete(i.id))}
              >
                <span className="mono agenda-hora">{i.hora}</span>
                <span className={"agenda-marca " + i.tipo} />
                <span className="agenda-titulo">{i.titulo}</span>
              </button>
            ))
          ))}

        {modo === "lembretes" &&
          (lembretesDoDia.length === 0 ? (
            <div className="agenda-vazio">Nenhum lembrete nesse dia.</div>
          ) : (
            lembretesDoDia.map((r) => (
              <button
                type="button"
                className={"agenda-row" + (r.done ? " feito" : "")}
                key={r.id}
                onClick={() => onAbrirLembrete(r.id)}
              >
                <span className="mono agenda-hora">{r.time ?? "--:--"}</span>
                <span className="agenda-marca lembrete" />
                <span className="agenda-titulo">{r.title}</span>
              </button>
            ))
          ))}

        {modo === "mes" && (
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
