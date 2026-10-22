"use client";

import { useBoardCtx } from "./board-context";
import { GiftIcon } from "./icons";
import { diasAteAniversario, idadeQueFara, ordenarPorProximos } from "@/lib/board/aniversarios";
import { todayISO } from "@/lib/date-utils";
import { isMeetingTask } from "@/lib/types";

/** Até quantos dias antes o aniversário aparece na linha sob a saudação (igual ao bolinho da barra de cima). */
const DIAS_NA_SAUDACAO = 3;

/**
 * Saudação da tela do dia, em uma frase só: "Bom dia, Leandro. 2 reuniões hoje e 3
 * tarefas atrasadas." Fica pequena de propósito (pedido: o texto grande poluía a tela).
 * O vermelho existe só aqui, na frase das atrasadas.
 *
 * Embaixo, uma linha discreta e cinza com quem faz aniversário hoje ou nos próximos dias.
 */
export function DayGreeting() {
  const { board } = useBoardCtx();
  const hoje = todayISO();
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const nome = board.state.settings.preferredName?.trim();

  const reunioes = board.state.tasks.filter((t) => t.date === hoje && !t.done && !t.deletedAt && isMeetingTask(t)).length;
  const atrasadas = board.state.tasks.filter((t) => !t.done && !t.deletedAt && t.date && t.date < hoje).length;

  const partes: { texto: string; cor: "accent" | "danger" }[] = [];
  if (reunioes > 0) partes.push({ texto: `${reunioes} ${reunioes === 1 ? "reunião" : "reuniões"} hoje`, cor: "accent" });
  if (atrasadas > 0) partes.push({ texto: `${atrasadas} ${atrasadas === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`, cor: "danger" });

  const aniversarios = ordenarPorProximos(
    board.state.birthdays.filter((b) => !b.pending),
    hoje
  ).filter((b) => diasAteAniversario(b, hoje) <= DIAS_NA_SAUDACAO);
  const dias = [...new Set(aniversarios.map((b) => diasAteAniversario(b, hoje)))];

  return (
    <div className="day-greeting">
      <h1 className="day-greeting-text">
        {saudacao}
        {nome ? `, ${nome}` : ""}.{" "}
        {partes.length === 0 ? (
          <span className="day-greeting-calma">Nada atrasado e nenhuma reunião hoje.</span>
        ) : (
          partes.map((p, i) => (
            <span key={p.texto}>
              {i > 0 && " e "}
              <span className={p.cor === "danger" ? "day-greeting-atraso" : "day-greeting-reuniao"}>{p.texto}</span>
              {i === partes.length - 1 && "."}
            </span>
          ))
        )}
      </h1>
      {aniversarios.length > 0 && (
        <div className="day-greeting-aniv">
          <GiftIcon />
          <span>
            {dias.map((d, i) => {
              const nomes = aniversarios
                .filter((b) => diasAteAniversario(b, hoje) === d)
                .map((b) => {
                  const idade = idadeQueFara(b, hoje);
                  return idade ? `${b.name.trim()} (${idade} anos)` : b.name.trim();
                })
                .join(", ");
              const rotulo = d === 0 ? "Hoje" : d === 1 ? "Amanhã" : `Em ${d} dias`;
              return (
                <span key={d}>
                  {i > 0 && " · "}
                  <b>{rotulo}:</b> {nomes}
                </span>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
}
