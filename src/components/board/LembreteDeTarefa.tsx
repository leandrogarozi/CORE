"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { WhatsAppIcon } from "./icons";
import { todayISO, fmtDayMonth } from "@/lib/date-utils";
import { REMINDER_ALERT_PRESETS } from "@/lib/board/reminder-alerts";
import { entraEmReunioes, isMeetingTask } from "@/lib/types";

/**
 * "Lembrar de uma reunião ou tarefa": escolhe uma que já está na agenda, e o lembrete nasce com o título, a data
 * e a hora dela. A pessoa só diz quanto antes avisar e se quer no WhatsApp. Evita cadastrar a mesma coisa duas vezes
 * (uma na tarefa e outra em Lembretes).
 */
export function LembreteDeTarefa() {
  const { board } = useBoardCtx();
  const [tarefaId, setTarefaId] = useState("");
  const [antes, setAntes] = useState(0);
  const [zap, setZap] = useState(false);
  const [feito, setFeito] = useState("");

  const hoje = todayISO();
  const comLembrete = new Set(board.state.reminders.filter((r) => r.taskId && !r.deletedAt).map((r) => r.taskId));
  // Com data e hora, daqui para a frente, ainda sem lembrete. Reuniões e eventos primeiro: são o que mais precisa de aviso.
  const candidatas = board.state.tasks
    .filter((t) => !t.deletedAt && !t.done && t.date && t.date >= hoje && t.time && !comLembrete.has(t.id))
    .sort((a, b) => {
      const pa = entraEmReunioes(a) || a.isEvent ? 0 : 1;
      const pb = entraEmReunioes(b) || b.isEvent ? 0 : 1;
      return pa - pb || (a.date! + a.time).localeCompare(b.date! + b.time);
    })
    .slice(0, 40);

  const escolhida = candidatas.find((t) => t.id === tarefaId);

  function criar() {
    if (!escolhida?.date) return;
    board.setTaskReminder(escolhida.id, {
      date: escolhida.date,
      time: escolhida.time || null,
      repeat: "none",
      weekDays: null,
      alertMinutesBefore: antes,
      whatsapp: zap,
    });
    const quando = antes === 0 ? "no horário" : (REMINDER_ALERT_PRESETS.find((p) => p.v === antes)?.l ?? "");
    setFeito(`Lembrete criado para “${escolhida.title}” (${quando}${zap ? ", também no WhatsApp" : ""}).`);
    setTarefaId("");
    setZap(false);
  }

  if (!candidatas.length && !feito) return null;

  return (
    <div className="list-quickadd-card lembrete-de-tarefa">
      <div className="lembrete-de-tarefa-titulo">Lembrar de uma reunião ou tarefa que já está na agenda</div>
      <div className="lembrete-de-tarefa-linha">
        <select
          aria-label="Reunião ou tarefa"
          className="reminder-repeat-select"
          value={tarefaId}
          onChange={(e) => {
            setTarefaId(e.target.value);
            setFeito("");
          }}
        >
          <option value="">Escolher...</option>
          {candidatas.map((t) => (
            <option key={t.id} value={t.id}>
              {fmtDayMonth(t.date!)} {t.time} · {isMeetingTask(t) ? "Reunião: " : ""}
              {t.title}
            </option>
          ))}
        </select>
        <select aria-label="Quando avisar" className="reminder-repeat-select" value={antes} disabled={!escolhida} onChange={(e) => setAntes(Number(e.target.value))}>
          {REMINDER_ALERT_PRESETS.map((p) => (
            <option key={p.l} value={p.v ?? 0}>
              {p.v === 0 ? "No horário" : p.l}
            </option>
          ))}
        </select>
        <button type="button" className={"reminder-zap-opcao" + (zap ? " ativo" : "")} aria-pressed={zap} disabled={!escolhida} onClick={() => setZap((v) => !v)}>
          <WhatsAppIcon filled={zap} />
          <span>Avisar no WhatsApp</span>
        </button>
        <button type="button" className="btn btn-accent" disabled={!escolhida} onClick={criar}>
          Criar lembrete
        </button>
      </div>
      {feito && <div className="meeting-new-ok">{feito}</div>}
    </div>
  );
}
