"use client";

import { useState, type CSSProperties } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { NoteField } from "./NoteField";
import { MicButton } from "./MicButton";
import { BookIcon, BookOpenIcon, CheckIcon, ChevronIcon, TrashIcon, WarningIcon } from "./icons";
import { EmConstrucao } from "./EmConstrucao";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { constanciaDoEstudo, studyPlanMath, tempoPorModulo } from "@/lib/board/study-plan";
import { fmtHM, fmtShortDate, fmtTempoCurto, todayISO } from "@/lib/date-utils";
import type { StudyModule, StudyPlan } from "@/lib/types";
import { TutorialLink } from "./TutorialLink";

const DIAS = [
  { v: 0, l: "D" },
  { v: 1, l: "S" },
  { v: 2, l: "T" },
  { v: 3, l: "Q" },
  { v: 4, l: "Q" },
  { v: 5, l: "S" },
  { v: 6, l: "S" },
];

type Rascunho = { total: string; min: string; inicio: string; prazo: string; dias: number[] };

/** Os campos do plano que só valem quando a pessoa toca em Salvar (antes, cada campo gravava ao sair dele). */
function rascunhoDe(plan: StudyPlan): Rascunho {
  return {
    total: plan.totalMinutes ? String(plan.totalMinutes / 60).replace(".", ",") : "",
    min: String(plan.sessionMinutes),
    inicio: plan.startDate ?? "",
    prazo: plan.deadline ?? "",
    dias: [...plan.weekDays].sort(),
  };
}

const COR_DO_PLANO = { ativo: "#4A47D5", pausado: "#C28A1E", concluido: "#3E8E5A" } as const;

/** Lista colada ("Planejamento estratégico 3h", um por linha) vira módulos com as horas. */
function modulosDeUmTexto(texto: string): { name: string; minutes: number | null }[] {
  const saida: { name: string; minutes: number | null }[] = [];
  for (const linha of texto.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = linha.match(/^(.*?)[\s\-–:,;]+(\d+(?:[.,]\d+)?)\s*(?:h|hs|hora|horas)\.?$/i);
    if (m && m[1].trim()) {
      const h = Number(m[2].replace(",", "."));
      saida.push({ name: m[1].trim(), minutes: Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null });
    } else saida.push({ name: linha.replace(/^[-•*\d.)\s]+/, "").trim() || linha, minutes: null });
  }
  return saida.slice(0, 60);
}

function plano_status(plan: StudyPlan, restanteMin: number): keyof typeof COR_DO_PLANO {
  if (plan.status === "concluido" || (plan.totalMinutes && restanteMin === 0)) return "concluido";
  return plan.status === "pausado" ? "pausado" : "ativo";
}

function PlanCard({ plan }: { plan: StudyPlan }) {
  const { board, askConfirm, openTaskInDay } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [gerou, setGerou] = useState<string | null>(null);
  const [novoModulo, setNovoModulo] = useState("");
  const [novoModuloHoras, setNovoModuloHoras] = useState("");
  const [colando, setColando] = useState(false);
  const [listaColada, setListaColada] = useState("");
  const [deixouAtrasar, setDeixouAtrasar] = useState(false);
  // O rascunho acompanha o plano salvo: se ele muda por fora (o FARO ajustou, por exemplo), o rascunho refaz.
  const assinatura = [plan.totalMinutes, plan.sessionMinutes, plan.startDate, plan.deadline, plan.weekDays.join(",")].join("|");
  const [assinaturaVista, setAssinaturaVista] = useState(assinatura);
  const [rasc, setRasc] = useState<Rascunho>(() => rascunhoDe(plan));
  if (assinatura !== assinaturaVista) {
    setAssinaturaVista(assinatura);
    setRasc(rascunhoDe(plan));
  }
  const salvoRasc = rascunhoDe(plan);
  const sujo = JSON.stringify(rasc) !== JSON.stringify(salvoRasc);

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
    const novo = rasc.dias.includes(d) ? rasc.dias.filter((x) => x !== d) : [...rasc.dias, d].sort();
    if (novo.length) setRasc({ ...rasc, dias: novo });
  }

  function salvar() {
    const h = Number(rasc.total.replace(",", "."));
    const min = Number(rasc.min);
    board.updateStudyPlan(plan.id, {
      totalMinutes: Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null,
      sessionMinutes: Number.isFinite(min) && min >= 5 ? min : plan.sessionMinutes,
      startDate: rasc.inicio || null,
      deadline: rasc.prazo || null,
      weekDays: rasc.dias,
    });
  }

  function colarModulos() {
    const novos = modulosDeUmTexto(listaColada).map((x) => ({ id: crypto.randomUUID(), name: x.name, minutes: x.minutes, sessionIds: [] as string[] }));
    if (!novos.length) return;
    salvarModulos([...plan.modules, ...novos]);
    setListaColada("");
    setColando(false);
  }

  // Sessões que já passaram do dia e não foram feitas: o que polui a agenda quando ele não está estudando.
  const hojeISO = todayISO();
  const atrasadas = sessoes.filter((t) => !t.done && t.date && t.date < hojeISO);
  const emAberto = sessoes.filter((t) => !t.done);
  const pausado = plan.status === "pausado";

  function pausar() {
    askConfirm(
      `Pausar "${plan.name}"? As ${emAberto.length} sessões em aberto saem da sua agenda (vão pra Lixeira) e nada fica atrasado. As já feitas ficam no histórico. Quando retomar, o FARO redistribui a partir de hoje.`,
      () => {
        const n = board.pauseStudyPlan(plan.id);
        setGerou(`Plano pausado. ${n} sessão(ões) saíram da agenda.`);
      }
    );
  }

  async function retomar() {
    board.updateStudyPlan(plan.id, { status: "ativo" });
    const n = await board.generateStudySessions(plan.id);
    setGerou(n > 0 ? `Plano retomado: ${n} sessão(ões) na agenda a partir de hoje.` : "Plano retomado.");
  }

  function cancelar() {
    askConfirm(
      `Cancelar o plano "${plan.name}"? Ele some da lista e as ${emAberto.length} sessões ainda não feitas saem da sua agenda (vão pra Lixeira). As já concluídas ficam no histórico.`,
      () => board.deleteStudyPlan(plan.id)
    );
  }

  async function gerar() {
    if (pausado) board.updateStudyPlan(plan.id, { status: "ativo" });
    const n = await board.generateStudySessions(plan.id);
    setGerou(
      n > 0
        ? `${n} sessão(ões) criada(s) na sua agenda.`
        : "Nada novo pra criar — as sessões desse plano já estão distribuídas."
    );
    window.setTimeout(() => setGerou(null), 5000);
  }

  const moduloAtual = tempos.find((t) => !t.estimadoMin || t.feitoSeg / 60 < t.estimadoMin)?.name ?? null;

  return (
    <div className={"study-card com-filete" + (open ? " open" : "")} style={{ "--k": COR_DO_PLANO[plano_status(plan, m.restanteMin)] } as CSSProperties}>
      <div className="study-card-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <ChevronIcon />
        </button>
        <span className="tile-tipo" aria-hidden="true">
          <BookOpenIcon />
        </span>
        <div className="study-card-titulo">
          <span className="study-card-name">{plan.name}</span>
          <span className="study-card-sub">
            {moduloAtual ? `Módulo atual: ${moduloAtual} · ` : ""}
            {feitas.length} de {sessoes.length || "—"} sessões
            {feitoSeg > 0 && <> · {fmtTempoCurto(feitoSeg)} estudados</>}
          </span>
        </div>
        {pausado && <span className="study-paused">pausado</span>}
        {m.naoCabeNoPrazo && (
          <span className="study-late" title="No ritmo atual não fecha no prazo">
            <WarningIcon /> fora do prazo
          </span>
        )}
        {m.totalMin > 0 && <span className="study-pct">{m.pctFeito}%</span>}
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
      {/* A barra de progresso do plano, de ponta a ponta, logo abaixo do título. */}
      <div className="study-bar">
        <div className="study-bar-fill" style={{ width: `${m.pctFeito}%` }} />
      </div>

      {/* Estudo parado não pode poluir a agenda: sessão atrasada vira uma saída em um clique. */}
      {atrasadas.length > 0 && !pausado && !deixouAtrasar && (
        <div className="study-atraso">
          <span>
            <WarningIcon /> Você pulou {atrasadas.length === 1 ? "1 dia" : `${atrasadas.length} dias`}: {atrasadas.length === 1 ? "1 sessão ficou" : `${atrasadas.length} sessões ficaram`} para trás. O que já foi feito não muda.
          </span>
          <span className="study-atraso-acoes">
            <button
              type="button"
              className="btn btn-accent"
              onClick={() =>
                askConfirm(
                  `Empurrar tudo para frente? As ${atrasadas.length} sessões atrasadas vão pra Lixeira e o calendário é refeito a partir de hoje, no seu ritmo. As já feitas ficam.`,
                  gerar
                )
              }
            >
              Empurrar tudo para frente
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setDeixouAtrasar(true)}>
              Deixar como está
            </button>
            <button type="button" className="btn btn-ghost" onClick={pausar}>
              Pausar plano
            </button>
          </span>
        </div>
      )}

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
                <input type="text" inputMode="decimal" placeholder="ex.: 20" value={rasc.total} onChange={(e) => setRasc({ ...rasc, total: e.target.value })} />
              </div>
            </label>
            <label className="prop-row">
              <span className="prop-label">Min por dia</span>
              <div className="prop-value">
                <input type="number" min={5} step={5} value={rasc.min} onChange={(e) => setRasc({ ...rasc, min: e.target.value })} />
              </div>
            </label>
            <label className="prop-row">
              <span className="prop-label">Começa em</span>
              <div className="prop-value">
                <input type="date" value={rasc.inicio} onChange={(e) => setRasc({ ...rasc, inicio: e.target.value })} />
              </div>
            </label>
            <label className="prop-row">
              <span className="prop-label">Prazo</span>
              <div className="prop-value">
                <input type="date" value={rasc.prazo} onChange={(e) => setRasc({ ...rasc, prazo: e.target.value })} />
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
                  className={"study-day" + (rasc.dias.includes(d.v) ? " on" : "")}
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
            <div className="study-colar">
              <button type="button" className="btn btn-ghost" onClick={() => setColando((v) => !v)}>
                {colando ? "Fechar a lista colada" : "Colar uma lista de módulos"}
              </button>
              {colando && (
                <>
                  <textarea
                    className="settings-input study-colar-texto"
                    rows={5}
                    placeholder={"Um módulo por linha, com as horas no fim:\nPlanejamento estratégico 3h\nFinanças para gestores 5h"}
                    value={listaColada}
                    onChange={(e) => setListaColada(e.target.value)}
                    aria-label="Lista de módulos"
                  />
                  <button type="button" className="btn btn-accent" onClick={colarModulos} disabled={!listaColada.trim()}>
                    Adicionar módulos
                  </button>
                </>
              )}
            </div>
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
            <button type="button" className="btn btn-ghost danger-hover" onClick={cancelar}>
              Cancelar plano
            </button>
            <button type="button" className="btn btn-ghost" onClick={pausado ? retomar : pausar}>
              {pausado ? "Retomar" : "Pausar"}
            </button>
            <span className="study-actions-espaco" />
            {sujo && <span className="study-sujo">Alterações sem salvar</span>}
            <button type="button" className={"btn " + (sujo ? "btn-accent" : "btn-ghost")} onClick={salvar} disabled={!sujo}>
              {sujo ? "Salvar" : "Salvo"}
            </button>
            <button type="button" className="btn btn-accent" onClick={gerar} disabled={sujo} title={sujo ? "Salve antes de distribuir" : undefined}>
              Distribuir na agenda
            </button>
          </div>
          <p className="study-prev">
            {sujo
              ? "Salve as alterações para liberar o Distribuir na agenda."
              : m.sessoesRestantes > 0
                ? `Vai distribuir ${m.sessoesRestantes} sessões de ${plan.sessionMinutes} min${m.terminaEm ? `, até ${fmtShortDate(m.terminaEm)}` : ""}. Só ao confirmar o FARO coloca na agenda.`
                : "Diga o total de horas e os dias de estudo para ver a prévia."}
          </p>
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

  // Abas como em Projetos: o que está em andamento, o que está pausado e o que já acabou.
  const [aba, setAba] = useState<"todos" | "ativo" | "pausado" | "concluido">("ativo");
  const todos = board.state.studyPlans;
  const doGrupo = (p: StudyPlan) => (p.status === "concluido" ? "concluido" : p.status === "pausado" ? "pausado" : "ativo");
  const ativos = todos.filter((p) => aba === "todos" || doGrupo(p) === aba);
  const total = (g: "ativo" | "pausado" | "concluido") => todos.filter((p) => doGrupo(p) === g).length;

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Plano de Estudo</span>
        <TutorialLink secao="estudo" />
      </div>

      <EmConstrucao tela="O Plano de Estudo" />
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
              placeholder="Novo estudo (ex.: Pós — Gestão de Pessoas) e pressionar Enter"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={handleAdd}
            />
            <MicButton onText={(t) => setNewName((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o nome do estudo" />
            <EnviarBtn onClick={() => handleAdd()} label="Criar o estudo" />
          </div>
        </div>

        <div className="abas-plano">
          <button type="button" className={"aba-plano" + (aba === "todos" ? " on" : "")} onClick={() => setAba("todos")}>
            <BookIcon /> Todos <b>{todos.length}</b>
          </button>
          <button type="button" className={"aba-plano" + (aba === "ativo" ? " on" : "")} onClick={() => setAba("ativo")}>
            <BookOpenIcon /> Em andamento <b>{total("ativo")}</b>
          </button>
          <button type="button" className={"aba-plano pausado" + (aba === "pausado" ? " on" : "")} onClick={() => setAba("pausado")}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M8 5v14M16 5v14" />
            </svg>{" "}
            Pausados <b>{total("pausado")}</b>
          </button>
          <button type="button" className={"aba-plano concluido" + (aba === "concluido" ? " on" : "")} onClick={() => setAba("concluido")}>
            <CheckIcon /> Concluídos <b>{total("concluido")}</b>
          </button>
        </div>

        {!ativos.length && (
          <div className="list-card">
            <div className="hp-empty">
              {todos.length === 0 || aba === "todos" ? "Nenhum plano de estudo ainda." : aba === "ativo" ? "Nenhum plano em andamento." : aba === "pausado" ? "Nenhum plano pausado." : "Nenhum plano concluído ainda."}
            </div>
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
