"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { isMeetingTask, type Task } from "@/lib/types";

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
 * - **Lembretes**: os lembretes daquele dia, INCLUSIVE os sem horário — que por
 *   definição não cabem numa linha do tempo e sumiam do modo Dia.
 *
 * Teve um modo **Mês**, com o calendário do mês e marca nos dias ocupados, e
 * ele mandou tirar: *"só fica as datas, não faz sentido"*. Num painel estreito
 * o calendário só cabia como grade de números, e número de dia sem o que tem
 * naquele dia não é agenda — é calendário de parede.
 */
export function DayAgendaPanel({
  selectedDate,
  onAbrirTarefa,
  onAbrirLembrete,
}: {
  selectedDate: string;
  onAbrirTarefa: (task: Task) => void;
  onAbrirLembrete: (id: string) => void;
}) {
  const { board } = useBoardCtx();
  const [modo, setModo] = useState<"dia" | "lembretes">("dia");

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

  return (
    <div className="section agenda-section">
      <div className="section-head agenda-head">
        <span className="section-pill accent">Agenda</span>
        <div className="view-toggle">
          {(
            [
              ["dia", "Dia"],
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

      </div>
    </div>
  );
}
