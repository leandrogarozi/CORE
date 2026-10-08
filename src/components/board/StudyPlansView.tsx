"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { NoteField } from "./NoteField";
import { MicButton } from "./MicButton";
import { BookIcon, CheckIcon, ChevronIcon, TrashIcon, WarningIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { constanciaDoEstudo, studyPlanMath, tempoPorModulo } from "@/lib/board/study-plan";
import { fmtHM, fmtShortDate, fmtTempoCurto, todayISO } from "@/lib/date-utils";
import type { StudyModule, StudyPlan } from "@/lib/types";

const DIAS = [
  { v: 0, l: "D" },
  { v: 1, l: "S" },
  { v: 2, l: "T" },
  { v: 3, l: "Q" },
  { v: 4, l: "Q" },
  { v: 5, l: "S" },
  { v: 6, l: "S" },
];

function PlanCard({ plan }: { plan: StudyPlan }) {
  const { board, askConfirm, openTaskInDay } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [gerou, setGerou] = useState<string | null>(null);
  const [novoModulo, setNovoModulo] = useState("");
  const [novoModuloHoras, setNovoModuloHoras] = useState("");

  const sessoes = board.state.tasks.filter((t) => t.studyPlanId === plan.id);
  const feitas = sessoes.filter((t) => t.done);
  // O tempo feito vem do tempo por dia das sessões — é o mesmo número que o
  // Painel de Horas conta, não uma contabilidade paralela.
  const feitoSeg = board.state.taskTimeEntries
    .filter((e) => sessoes.some((t) => t.id === e.taskId))
    .reduce((soma, e) => soma + e.seconds, 0);
  const feitoMin = Math.round(feitoSeg / 60);
  const m = studyPlanMath(plan, feitoMin, todayISO());
  // Quantas ele deixou passar. Não depende de marcar nada: sessão com data
  // vencida e não concluída já é um pulo.
  const constancia = constanciaDoEstudo(sessoes, todayISO());
  const proxima = sessoes
    .filter((t) => !t.done && t.date)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0];

  const { modulos: tempos, semModuloSeg } = tempoPorModulo(plan, sessoes, board.state.taskTimeEntries);

  function salvarModulos(lista: StudyModule[]) {
    board.updateStudyPlan(plan.id, { modules: lista });
  }

  function adicionarModulo() {
    const nome = novoModulo.trim();
    if (!nome) return;
    const horas = Number(novoModuloHoras.replace(",", "."));
    salvarModulos([
      ...plan.modules,
      { id: crypto.randomUUID(), name: nome, minutes: Number.isFinite(horas) && horas > 0 ? Math.round(horas * 60) : null, sessionIds: [] },
    ]);
    setNovoModulo("");
    setNovoModuloHoras("");
  }

  // Uma sessão conta para um módulo só: ligar a um tira dos outros.
  function ligarSessao(sessaoId: string, moduloId: string) {
    salvarModulos(
      plan.modules.map((m) => {
        const sem = m.sessionIds.filter((id) => id !== sessaoId);
        return m.id === moduloId ? { ...m, sessionIds: [...sem, sessaoId] } : { ...m, sessionIds: sem };
      })
    );
  }

  const moduloDaSessao = (sessaoId: string) => plan.modules.find((m) => m.sessionIds.includes(sessaoId))?.id ?? "";
  const segDaSessao = (sessaoId: string) =>
    board.state.taskTimeEntries.filter((e) => e.taskId === sessaoId).reduce((soma, e) => soma + e.seconds, 0);
  // As sessões para ligar: as que já têm tempo ou foram feitas (as mais recentes primeiro) e as 3 próximas.
  const sessoesParaLigar = [
    ...sessoes.filter((t) => t.done || segDaSessao(t.id) > 0).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 8),
    ...sessoes.filter((t) => !t.done && segDaSessao(t.id) === 0 && t.date).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")).slice(0, 3),
  ];

  function toggleDia(d: number) {
    const atual = plan.weekDays;
    const novo = atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d].sort();
    if (novo.length) board.updateStudyPlan(plan.id, { weekDays: novo });
  }

  async function gerar() {
    const n = await board.generateStudySessions(plan.id);
    setGerou(
      n > 0
        ? `${n} sessão(ões) criada(s) na sua agenda.`
        : "Nada novo pra criar — as sessões desse plano já estão distribuídas."
    );
    window.setTimeout(() => setGerou(null), 5000);
  }

  return (
    <div className={"study-card" + (open ? " open" : "")}>
      <div className="study-card-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <ChevronIcon />
        </button>
        <span className="study-card-name">{plan.name}</span>
        {m.naoCabeNoPrazo && (
          <span className="study-late" title="No ritmo atual não fecha no prazo">
            <WarningIcon /> fora do prazo
          </span>
        )}
        <span className="study-progress mono">
          {feitas.length}/{sessoes.length || "—"} sessões
          {feitoSeg > 0 && <> · {fmtTempoCurto(feitoSeg)} estudados</>}
        </span>
        <button
          type="button"
          className="icon-btn danger-hover"
          title="Excluir plano"
          onClick={() =>
            askConfirm(
              `Excluir o plano "${plan.name}"? As sessões ainda não feitas vão pra Lixeira; as já concluídas ficam no histórico.`,
              () => board.deleteStudyPlan(plan.id)
            )
          }
        >
          <TrashIcon />
        </button>
      </div>

      {/* A resposta que tira a montanha da frente: quanto por dia, e quando acaba. */}
      <div className="study-answer">
        {m.totalMin === 0 ? (
          <span className="study-answer-empty">Diga o tamanho do estudo pra eu calcular quanto dá por dia.</span>
        ) : m.restanteMin === 0 ? (
          <span className="study-answer-done">
            <CheckIcon /> Estudo concluído — {fmtHM(m.totalMin)} no total.
          </span>
        ) : (
          <>
            {m.minPorDiaNoPrazo !== null ? (
              <span className="study-answer-main">
                <strong>{m.minPorDiaNoPrazo} min por dia</strong> pra terminar até {fmtShortDate(plan.deadline!)}
                <span className="study-answer-sub"> · {m.diasAteOPrazo} dias de estudo pela frente</span>
              </span>
            ) : (
              <span className="study-answer-main">
                <strong>{m.sessoesRestantes} sessões</strong> de {plan.sessionMinutes} min ainda faltam
              </span>
            )}
            {m.terminaEm && (
              <span className="study-answer-sub">
                No ritmo de {plan.sessionMinutes} min por dia, termina em {fmtShortDate(m.terminaEm)}.
              </span>
            )}
          </>
        )}
      </div>

      <div className="study-bar">
        <div className="study-bar-fill" style={{ width: `${m.pctFeito}%` }} />
      </div>
      <div className="study-bar-legend">
        {fmtTempoCurto(feitoSeg)} feitos{m.totalMin > 0 ? ` de ${fmtHM(m.totalMin)} (${m.pctFeito}%)` : ""}
        {proxima && (
          <button type="button" className="study-next" onClick={() => openTaskInDay(proxima)}>
            próxima: {fmtShortDate(proxima.date!)}
          </button>
        )}
      </div>

      {/* Constância. Só aparece quando já venceu alguma sessão — antes disso
          não há o que medir, e um "0 puladas" no primeiro dia seria elogio
          vazio. */}
      {constancia.cobradas > 0 && (
        <div className={"study-constancia" + (constancia.puladas > 0 ? " alerta" : "")}>
          {constancia.puladas === 0 ? (
            <>
              <CheckIcon /> {constancia.cobradas} de {constancia.cobradas} em dia
              {constancia.sequenciaAtual > 1 && <> · {constancia.sequenciaAtual} seguidas</>}
            </>
          ) : (
            <>
              <WarningIcon /> {constancia.puladas}{" "}
              {constancia.puladas === 1 ? "sessão passou sem fazer" : "sessões passaram sem fazer"} ·{" "}
              {constancia.pctComparecimento}% de {constancia.cobradas} cobradas
            </>
          )}
        </div>
      )}

      {open && (
        <div className="study-card-body">
          <div className="prop-list">
            <label className="prop-row">
              <span className="prop-label">Total (horas)</span>
              <div className="prop-value">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="ex.: 20"
                  defaultValue={plan.totalMinutes ? plan.totalMinutes / 60 : ""}
                  onBlur={(e) => {
                    const h = Number(e.target.value.replace(",", "."));
                    board.updateStudyPlan(plan.id, {
                      totalMinutes: Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null,
                    });
                  }}
                />
              </div>
            </label>
            <label className="prop-row">
              <span className="prop-label">Min por dia</span>
              <div className="prop-value">
                <input
                  type="number"
                  min={5}
                  step={5}
                  defaultValue={plan.sessionMinutes}
                  onBlur={(e) => {
                    const min = Number(e.target.value);
                    if (Number.isFinite(min) && min >= 5) board.updateStudyPlan(plan.id, { sessionMinutes: min });
                  }}
                />
              </div>
            </label>
            <label className="prop-row">
              <span className="prop-label">Começa em</span>
              <div className="prop-value">
                <input
                  type="date"
                  defaultValue={plan.startDate ?? ""}
                  onBlur={(e) => board.updateStudyPlan(plan.id, { startDate: e.target.value || null })}
                />
              </div>
            </label>
            <label className="prop-row">
              <span className="prop-label">Prazo</span>
              <div className="prop-value">
                <input
                  type="date"
                  defaultValue={plan.deadline ?? ""}
                  onBlur={(e) => board.updateStudyPlan(plan.id, { deadline: e.target.value || null })}
                />
              </div>
            </label>
          </div>

          <div className="study-days">
            <span className="prop-label">Dias de estudo</span>
            <div className="study-days-row">
              {DIAS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  className={"study-day" + (plan.weekDays.includes(d.v) ? " on" : "")}
                  title={["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][d.v]}
                  onClick={() => toggleDia(d.v)}
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>

          <div className="study-modulos">
            <span className="prop-label">Módulos (tempo gasto em cada parte)</span>
            {tempos.map((t) => {
              const pct = t.estimadoMin ? Math.min(100, Math.round((t.feitoSeg / 60 / t.estimadoMin) * 100)) : 0;
              return (
                <div key={t.id} className="study-modulo">
                  <input
                    type="text"
                    className="study-modulo-nome"
                    defaultValue={t.name}
                    aria-label="Nome do módulo"
                    onBlur={(e) => {
                      const nome = e.target.value.trim();
                      if (nome && nome !== t.name) salvarModulos(plan.modules.map((m) => (m.id === t.id ? { ...m, name: nome } : m)));
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    className="study-modulo-horas"
                    placeholder="h"
                    defaultValue={t.estimadoMin ? t.estimadoMin / 60 : ""}
                    aria-label="Horas estimadas do módulo"
                    onBlur={(e) => {
                      const h = Number(e.target.value.replace(",", "."));
                      const min = Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null;
                      if (min !== t.estimadoMin) salvarModulos(plan.modules.map((m) => (m.id === t.id ? { ...m, minutes: min } : m)));
                    }}
                  />
                  <span className="study-modulo-tempo mono">
                    {fmtTempoCurto(t.feitoSeg)}
                    {t.estimadoMin ? ` de ${fmtHM(t.estimadoMin)} (${pct}%)` : ""}
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger-hover"
                    title="Excluir módulo (as sessões e o tempo registrado ficam)"
                    onClick={() => salvarModulos(plan.modules.filter((m) => m.id !== t.id))}
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
            {plan.modules.length === 0 && (
              <div className="hint-text" style={{ marginTop: 0 }}>
                Divida o estudo em partes (ex.: Módulo 1, Módulo 2…) para ver quanto tempo cada uma leva de verdade.
              </div>
            )}
            <div className="study-modulo study-modulo-novo">
              <input
                type="text"
                className="study-modulo-nome"
                placeholder="+ Novo módulo"
                value={novoModulo}
                onChange={(e) => setNovoModulo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarModulo()}
              />
              <input
                type="number"
                min={0}
                step="0.5"
                className="study-modulo-horas"
                placeholder="h"
                value={novoModuloHoras}
                onChange={(e) => setNovoModuloHoras(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarModulo()}
              />
              <button type="button" className="btn btn-ghost" onClick={adicionarModulo} disabled={!novoModulo.trim()}>
                Adicionar
              </button>
            </div>
            {plan.modules.length > 0 && sessoesParaLigar.length > 0 && (
              <div className="study-ligar">
                <span className="prop-label">Qual módulo você estudou em cada sessão?</span>
                {sessoesParaLigar.map((t) => (
                  <div key={t.id} className="study-ligar-linha">
                    <span className="study-ligar-data mono">{t.date ? fmtShortDate(t.date) : "—"}</span>
                    <span className="study-ligar-tempo mono">{segDaSessao(t.id) > 0 ? fmtTempoCurto(segDaSessao(t.id)) : t.done ? "feita" : "a fazer"}</span>
                    <select
                      className="know-tipo"
                      value={moduloDaSessao(t.id)}
                      aria-label="Módulo desta sessão"
                      onChange={(e) => e.target.value && ligarSessao(t.id, e.target.value)}
                    >
                      <option value="">escolher módulo…</option>
                      {plan.modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {semModuloSeg > 0 && (
                  <div className="hint-text" style={{ marginTop: 4 }}>
                    {fmtTempoCurto(semModuloSeg)} em sessões ainda sem módulo.
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="study-field">
            <span className="prop-label">Do que se trata</span>
            <NoteField
              value={plan.description}
              placeholder="O que precisa ser estudado, o material, onde parou..."
              ariaLabel="Descrição do plano de estudo"
              onChange={() => {}}
              onPersist={(html) => board.updateStudyPlan(plan.id, { description: html })}
            />
          </label>

          <div className="edit-actions study-actions">
            {gerou && <span className="study-gerou">{gerou}</span>}
            <button type="button" className="btn btn-ghost" onClick={() => board.updateStudyPlan(plan.id, { status: plan.status === "pausado" ? "ativo" : "pausado" })}>
              {plan.status === "pausado" ? "Retomar" : "Pausar"}
            </button>
            <button type="button" className="btn btn-accent" onClick={gerar}>
              Distribuir na agenda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudyPlansView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [newName, setNewName] = useState("");

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    const id = await board.addStudyPlan(name);
    if (!id) setNewName(name);
  }

  const ativos = board.state.studyPlans.filter((p) => p.status !== "concluido");

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Plano de Estudo</span>
        <span style={{ width: 32 }} />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <BookIcon /> Quanto por dia?
          </div>
          <p>
            Estudo grande vira ansiedade porque não tem tamanho. Aqui você diz o tamanho e o prazo — e o FARO
            responde <strong>quanto por dia</strong> e <strong>quando acaba</strong>. Depois distribui as sessões
            no meio das suas tarefas, com o tempo de cada dia contando no Painel de Horas.
          </p>
        </div>

        <div className="list-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Novo estudo (ex.: Pós — Gestão de Pessoas) e pressionar Enter"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={handleAdd}
            />
            <MicButton onText={(t) => setNewName((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o nome do estudo" />
          </div>
        </div>

        {!ativos.length && (
          <div className="list-card">
            <div className="hp-empty">Nenhum plano de estudo ainda.</div>
          </div>
        )}

        <div className="study-list">
          {ativos.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
