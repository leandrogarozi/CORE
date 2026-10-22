"use client";

import { BellIcon, BoltIcon, CheckIcon, UsersGroupIcon } from "./icons";
import type { ViewMode } from "./Sidebar";

/**
 * Fileira de atalhos acima das tarefas: Nova tarefa, Lembrete, Reunião, Ideia.
 *
 * Não cria nada sozinha: leva para o lugar que já cria (o campo "Adicionar tarefa" da
 * lista, as telas de Lembretes, Reuniões e Ideias e Estudos) e põe o cursor no campo de
 * escrever quando a tela tem um. Assim nenhuma regra de criação fica duplicada.
 */
export function QuickActions({ onOpen }: { onOpen: (modo: ViewMode) => void }) {
  function irPara(modo: ViewMode) {
    onOpen(modo);
    // A tela nova só existe depois da troca; espera ela aparecer para focar o campo.
    setTimeout(() => document.querySelector<HTMLInputElement>(".quickadd-input")?.focus(), 150);
  }

  function novaTarefa() {
    const campo = document.getElementById("qa-day");
    campo?.scrollIntoView({ behavior: "smooth", block: "center" });
    campo?.focus();
  }

  return (
    <div className="quick-actions" role="group" aria-label="Criar rápido">
      <button type="button" className="quick-action" onClick={novaTarefa}>
        <span className="quick-action-icon destaque">
          <CheckIcon />
        </span>
        Nova tarefa
      </button>
      <button type="button" className="quick-action" onClick={() => irPara("reminders")}>
        <span className="quick-action-icon">
          <BellIcon />
        </span>
        Lembrete
      </button>
      <button type="button" className="quick-action" onClick={() => irPara("meetings")}>
        <span className="quick-action-icon">
          <UsersGroupIcon />
        </span>
        Reunião
      </button>
      <button type="button" className="quick-action" onClick={() => irPara("ideias")}>
        <span className="quick-action-icon">
          <BoltIcon />
        </span>
        Ideia
      </button>
    </div>
  );
}
