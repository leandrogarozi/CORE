"use client";

import { useState } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { CommentButton } from "./CommentButton";
import { MicButton } from "./MicButton";
import { ToggleSwitch } from "./ToggleSwitch";
import { BellIcon, CarIcon, CheckIcon, ChevronIcon, EditIcon, HeartIcon, HomeIcon, SettingsIcon, TrashIcon, WarningIcon, WhatsAppIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { ciclosDoItem } from "@/lib/board/maintenance";
import {
  MAINTENANCE_SUGGESTIONS,
  distancePerDay,
  lastReading,
  isoAddMonths,
  maintenanceStatus,
  odometerCheckDue,
} from "@/lib/board/maintenance";
import { fmtShortDate, isoAddDays, todayISO } from "@/lib/date-utils";
import { fmtBRL, parseAmountToCents } from "@/lib/money";
import type { MaintenanceAsset, MaintenanceItem, MaintenanceService } from "@/lib/types";
import { TutorialLink } from "./TutorialLink";

const KIND_LABEL: Record<MaintenanceAsset["kind"], string> = {
  veiculo: "Veículo",
  casa: "Casa",
  saude: "Saúde",
  outro: "Outro",
};

// O ícone de cada tipo: o mesmo na lista e no cabeçalho.
function KindIcon({ kind }: { kind: MaintenanceAsset["kind"] }) {
  if (kind === "casa") return <HomeIcon />;
  if (kind === "saude") return <HeartIcon />;
  if (kind === "outro") return <SettingsIcon />;
  return <CarIcon />;
}

function fmtKm(n: number): string {
  return n.toLocaleString("pt-BR");
}

// Linha de um item: o que interessa é quando vence e por quê.
function ItemRow({ item, asset }: { item: MaintenanceItem; asset: MaintenanceAsset }) {
  const { board, askConfirm } = useBoardCtx();
  const [registrando, setRegistrando] = useState(false);
  // Qual serviço o formulário está editando. null = registrando um novo.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  // Rascunho do nome: grava ao sair do campo, pra não mandar uma escrita por
  // tecla digitada.
  const [nomeDraft, setNomeDraft] = useState<string | null>(null);
  const [doneOn, setDoneOn] = useState(() => todayISO());
  const [odometro, setOdometro] = useState("");
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  // "Começar": a data em que o ciclo passa a contar (padrão hoje).
  const [comecando, setComecando] = useState(false);
  const [inicio, setInicio] = useState(() => todayISO());

  const readings = board.state.odometerReadings.filter((r) => r.assetId === asset.id);
  const st = maintenanceStatus(item, asset, readings);
  const historico = board.state.maintenanceServices
    .filter((s) => s.itemId === item.id)
    .sort((a, b) => b.doneOn.localeCompare(a.doneOn));

  const { feitas: rodadas, atual: cicloAtual } = ciclosDoItem(item, historico, st.dueDate);
  // "Início do novo ciclo": a data já vem sugerida (o fim do ciclo atual) e dá pra mudar. O Feito ao lado
  // registra o serviço nessa data e o ciclo seguinte começa nela.
  // O rascunho vale só para o ciclo em que foi digitado: ao fechar o ciclo, o próximo volta a sugerir o fim dele
  // (antes a data digitada ficava e o Ciclo 4 aparecia começando no mesmo dia do Ciclo 3).
  const [novoInicioDraft, setNovoInicioDraft] = useState<{ n: number; data: string } | null>(null);
  const novoInicio = (novoInicioDraft && novoInicioDraft.n === cicloAtual.n ? novoInicioDraft.data : null) ?? cicloAtual.sugestaoNovoInicio ?? todayISO();
  const rotuloDoCiclo = item.waiting
    ? `Ciclo ${cicloAtual.n} · aguardando começar`
    : cicloAtual.inicio && cicloAtual.fim
      ? `Ciclo ${cicloAtual.n} · ${fmtShortDate(cicloAtual.inicio)} a ${fmtShortDate(cicloAtual.fim)}`
      : cicloAtual.fim
        ? `Ciclo ${cicloAtual.n} · até ${fmtShortDate(cicloAtual.fim)}`
        : null;

  // "Feito" fecha o ciclo atual de uma vez: registra o serviço na data e o próximo ciclo já nasce com o intervalo
  // cadastrado. Km, valor e anotação ficam em "Editar ciclo". Sempre pergunta antes, para ninguém fechar o ciclo errado.
  function fecharCiclo(data: string) {
    const meses = item.intervalMonths && item.intervalMonths > 0 ? item.intervalMonths : null;
    const venceEm = meses ? isoAddMonths(data, meses) : null;
    const atual = lastReading(readings);
    const km = asset.tracksOdometer && atual && data === todayISO() ? atual.reading : null;
    const pergunta = cicloAtual.inicio
      ? `Marcar o Ciclo ${cicloAtual.n} como feito em ${fmtShortDate(data)}? O Ciclo ${cicloAtual.n + 1} começa nessa data${venceEm ? ` e vence em ${fmtShortDate(venceEm)}` : ""}.`
      : `Registrar que "${item.name}" foi feito em ${fmtShortDate(data)}? O próximo ciclo começa nessa data${venceEm ? ` e vence em ${fmtShortDate(venceEm)}` : ""}.`;
    askConfirm(pergunta, () => {
      board.registerMaintenanceService(item.id, data, km, null, "");
      setNovoInicioDraft(null);
    });
  }

  // Abre o formulário já com o que foi registrado: clicar em "Feito" de novo é
  // pra CORRIGIR, não pra criar outro registro. Sem serviço gravado mas com data
  // de "feito" no item (item antigo), a data entra preenchida.
  function abrirForm(servico: MaintenanceService | null, modo: "editar" | "novo" = "editar") {
    if (servico && modo === "editar") {
      setEditandoId(servico.id);
      setDoneOn(servico.doneOn);
      setOdometro(servico.odometer !== null ? String(servico.odometer) : "");
      setValor(servico.costCents !== null ? (servico.costCents / 100).toFixed(2).replace(".", ",") : "");
      setNota(servico.note);
    } else {
      setEditandoId(null);
      const antigo = modo === "editar" && !servico && item.lastDoneOn;
      setDoneOn(antigo ? (item.lastDoneOn as string) : todayISO());
      setOdometro(antigo && item.lastDoneOdometer !== null ? String(item.lastDoneOdometer) : "");
      setValor("");
      setNota("");
    }
    setRegistrando(true);
  }

  function registrar() {
    const km = odometro.trim() === "" ? null : Number(odometro.replace(/\D/g, ""));
    const custo = valor.trim() === "" ? null : parseAmountToCents(valor);
    if (editandoId) {
      board.updateMaintenanceService(editandoId, {
        doneOn,
        odometer: km !== null && Number.isFinite(km) ? Math.round(km) : null,
        costCents: custo,
        note: nota.trim(),
      });
    } else {
      board.registerMaintenanceService(item.id, doneOn, km, custo, nota);
    }
    setRegistrando(false);
    setEditandoId(null);
    setNovoInicioDraft(null);
  }

  // "a cada 12 meses ou 10.000 km" — o que o item usa pra calcular o próximo.
  const intervalo = (() => {
    const partes: string[] = [];
    if (item.intervalMonths) {
      partes.push(item.intervalMonths === 12 ? "1 ano" : `${item.intervalMonths} meses`);
    }
    if (item.intervalDistance && asset.tracksOdometer) {
      partes.push(`${fmtKm(item.intervalDistance)} ${asset.odometerUnit}`);
    }
    return partes.length ? `a cada ${partes.join(" ou ")}` : null;
  })();

  const resumo = (() => {
    if (item.waiting) {
      return item.intervalMonths
        ? `Aguardando começar: o prazo de ${item.intervalMonths} ${item.intervalMonths === 1 ? "mês" : "meses"} só conta a partir do início`
        : "Aguardando começar: nada conta nem avisa até você iniciar";
    }
    if (st.state === "sem_base") return "Nunca registrado — registre o último serviço pra começar a contar";
    const partes: string[] = [];
    if (st.dueDate) partes.push(`vence ${fmtShortDate(st.dueDate)}`);
    if (st.distanceLeft !== null) {
      partes.push(
        st.distanceLeft > 0
          ? `faltam ${fmtKm(st.distanceLeft)} ${asset.odometerUnit}`
          : `passou ${fmtKm(-st.distanceLeft)} ${asset.odometerUnit}`
      );
    }
    if (item.buyDaysBefore && st.dueDate) {
      partes.push(
        item.boughtOn ? "comprado" : `comprar até ${fmtShortDate(isoAddDays(st.dueDate, -item.buyDaysBefore))}`
      );
    }
    if (st.dueBy === "uso") partes.push("pelo uso");
    else if (st.dueBy === "tempo" && st.dueOdometer) partes.push("pelo tempo");
    if (!partes.length) return "Sem intervalo definido — clique em \"definir intervalo\"";
    return partes.join(" · ");
  })();

  return (
    <div className={"maint-item maint-" + st.state}>
      <div className="maint-item-head">
        <button type="button" className="synapse-card-toggle" onClick={() => setAberto((v) => !v)}>
          <ChevronIcon />
        </button>

        <input
          type="text"
          className="maint-item-name"
          value={nomeDraft ?? item.name}
          aria-label="Nome do item"
          onChange={(e) => setNomeDraft(e.target.value)}
          onBlur={() => {
            const novo = nomeDraft?.trim();
            if (novo && novo !== item.name) board.updateMaintenanceItem(item.id, { name: novo });
            setNomeDraft(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        {item.waiting && (
          <>
            <span className="maint-flag proximo">⏸ aguardando</span>
            <button
              type="button"
              className="btn btn-ghost maint-done-btn"
              title="Chegou? Comece a contar o prazo a partir de uma data"
              onClick={() => setComecando((v) => !v)}
            >
              Começar
            </button>
          </>
        )}
        {st.state === "vencido" && (
          <span className="maint-flag vencido">
            <WarningIcon /> vencido
          </span>
        )}
        {st.state === "proximo" && <span className="maint-flag proximo">chegando</span>}
        {/* "Comprei" na própria linha: é o gesto que para o aviso de compra. */}
        {item.buyDaysBefore && !item.boughtOn && st.dueDate && todayISO() >= isoAddDays(st.dueDate, -item.buyDaysBefore) && (
          <button
            type="button"
            className="btn btn-ghost maint-done-btn"
            title="Já comprei o que precisa: para o aviso de compra"
            onClick={() => board.updateMaintenanceItem(item.id, { boughtOn: todayISO() })}
          >
            <CheckIcon /> Comprei
          </button>
        )}
        {/* O intervalo fica à vista: ele estava só dentro do item aberto, e o
            Leandro não achou onde trocar 10.000 por 16.000 km. Clicar abre
            direto o lugar de editar. */}
        {rotuloDoCiclo ? (
          <button
            type="button"
            className={"maint-ciclo" + (item.waiting ? " espera" : "")}
            title={`${intervalo ?? "Sem intervalo"}. Clique pra abrir o ciclo.`}
            onClick={() => setAberto(true)}
          >
            {rotuloDoCiclo}
          </button>
        ) : (
          <button
            type="button"
            className={"maint-interval" + (intervalo === null ? " vazio" : "")}
            title="Clique pra mudar o intervalo"
            onClick={() => setAberto(true)}
          >
            {intervalo ?? "definir intervalo"}
          </button>
        )}
        <span className="maint-item-resumo">{resumo}</span>
        {/* Sem data de vencimento não há quando avisar — é o caso do item que
            vence por quilometragem e ainda não tem leituras pra estimar quando. */}
        <button
          type="button"
          className={"icon-btn zap-btn" + (item.whatsapp && st.dueDate ? " active" : "")}
          disabled={!st.dueDate}
          title={
            !st.dueDate
              ? "Sem data de vencimento ainda — registre o odômetro ou defina o intervalo em meses"
              : item.whatsapp && st.dueDate
                ? `Avisa no WhatsApp ${item.alertDaysBefore} dia(s) antes. Clique pra desligar.`
                : "Avisar no WhatsApp antes de vencer"
          }
          onClick={() => board.setMaintenanceWhatsapp(item.id, !item.whatsapp)}
        >
          <WhatsAppIcon filled={!!(item.whatsapp && st.dueDate)} />
        </button>
        {/* O que importa na linha é o ciclo que precisa de atenção. O último "feito" é só informação (não clica: antes
            parecia o botão do ciclo vencido). Só quando o ciclo está vencido, chegando ou sem registro aparece o
            "Feito", que pergunta e já abre o próximo ciclo. */}
        {!item.waiting && st.state !== "ok" ? (
          <button
            type="button"
            className="btn btn-ghost maint-done-btn"
            title={st.state === "sem_base" ? "Registrar que essa manutenção foi feita" : `Fechar o Ciclo ${cicloAtual.n}: marca como feito e abre o próximo`}
            onClick={() => fecharCiclo(todayISO())}
          >
            <CheckIcon /> Feito
          </button>
        ) : (
          item.lastDoneOn && (
            <span className="maint-ultimo mono" title={`Último serviço registrado em ${fmtShortDate(item.lastDoneOn)}`}>
              último {fmtShortDate(item.lastDoneOn)}
            </span>
          )
        )}
        {/* Editar não tinha botão: pra mudar intervalo ou antecedência era
            preciso adivinhar que o nome e a etiqueta de intervalo abriam o
            item. Dois cliques escondidos não são um caminho. */}
        <button
          type="button"
          className={"icon-btn" + (aberto ? " ativo" : "")}
          title={aberto ? "Fechar a edição" : "Editar esse item"}
          aria-label={`Editar ${item.name}`}
          onClick={() => setAberto((v) => !v)}
        >
          <EditIcon />
        </button>
      </div>

      {item.waiting && comecando && (
        <div className="maint-register">
          <div className="maint-explain" style={{ marginTop: 0 }}>
            Quando você começou (ou vai começar)?
            {item.intervalMonths
              ? ` O próximo prazo fica ${item.intervalMonths} ${item.intervalMonths === 1 ? "mês" : "meses"} depois dessa data.`
              : " Defina o intervalo em meses para o FARO calcular o próximo prazo."}
          </div>
          <div className="maint-register-row">
            <label>
              <span className="prop-label">Início</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
            {item.intervalMonths && inicio && (
              <label>
                <span className="prop-label">Próximo</span>
                <span className="mono">{fmtShortDate(isoAddMonths(inicio, item.intervalMonths))}</span>
              </label>
            )}
          </div>
          <div className="edit-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setComecando(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-accent"
              disabled={!inicio}
              onClick={() => {
                board.updateMaintenanceItem(item.id, { waiting: false, cycleStartOn: inicio });
                setComecando(false);
              }}
            >
              Começar a contar
            </button>
          </div>
        </div>
      )}

      {registrando && (
        <div className="maint-register">
          <div className="maint-explain" style={{ marginTop: 0 }}>
            {editandoId ? (
              <>
                Corrigindo o serviço de <strong>{fmtShortDate(historico.find((h) => h.id === editandoId)?.doneOn ?? doneOn)}</strong>.
                Salvar muda este registro, não cria outro.
              </>
            ) : (
              <>
                Fechando o <strong>Ciclo {cicloAtual.n}</strong>: o <strong>Ciclo {cicloAtual.n + 1}</strong> começa na data abaixo.
              </>
            )}
          </div>
          <div className="maint-register-row">
            <label>
              <span className="prop-label">Quando</span>
              <input type="date" value={doneOn} onChange={(e) => setDoneOn(e.target.value)} />
            </label>
            {asset.tracksOdometer && (
              <label>
                <span className="prop-label">{asset.odometerUnit} no momento</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ex.: 47300"
                  value={odometro}
                  onChange={(e) => setOdometro(e.target.value)}
                />
              </label>
            )}
            <label>
              <span className="prop-label">Quanto custou</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="opcional"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </label>
          </div>
          <div className="maint-register-row">
            <label className="maint-grow">
              <span className="prop-label">Observação</span>
              <div className="postpone-input-row">
                <input
                  type="text"
                  placeholder="Onde fez, o que trocou..."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
                <MicButton onText={(t) => setNota((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar a observação" />
              </div>
            </label>
          </div>
          <div className="edit-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setRegistrando(false)}>
              Cancelar
            </button>
            {editandoId && (
              <button type="button" className="btn btn-ghost" onClick={() => abrirForm(null, "novo")}>
                Registrar um novo serviço
              </button>
            )}
            <button type="button" className="btn btn-accent" onClick={registrar}>
              {editandoId ? "Salvar" : "Registrar serviço"}
            </button>
          </div>
        </div>
      )}

      {aberto && (
        <div className="maint-item-body">
          <div className="maint-secao maint-ciclo-atual">
            <div className="maint-secao-titulo">Ciclo atual</div>
            <div className="maint-ciclo-linha">
              <strong>Ciclo {cicloAtual.n}</strong>
              <span className="maint-ciclo-info">
                {item.waiting
                  ? "aguardando começar: nada conta nem avisa até você iniciar"
                  : cicloAtual.inicio
                    ? `começou em ${fmtShortDate(cicloAtual.inicio)}${intervalo ? ` · ${intervalo}` : ""}`
                    : "sem data de início ainda: registre o último serviço ou defina o início abaixo"}
              </span>
            </div>
            {!item.waiting && (
              <div className="maint-ciclo-novo">
                <span className="maint-ciclo-novo-rotulo">Início do novo ciclo (Ciclo {cicloAtual.n + 1})</span>
                <input
                  type="date"
                  value={novoInicio}
                  onChange={(e) => setNovoInicioDraft(e.target.value ? { n: cicloAtual.n, data: e.target.value } : null)}
                  aria-label="Data de início do novo ciclo"
                />
                <button
                  type="button"
                  className="btn btn-ghost maint-done-btn"
                  title="Registra que foi feito nessa data e começa o próximo ciclo a partir dela"
                  onClick={() => fecharCiclo(novoInicio)}
                >
                  <CheckIcon /> Feito
                </button>
                {historico.length > 0 && (
                  <button type="button" className="link-acao" onClick={() => abrirForm(historico[0])}>
                    Editar ciclo {rodadas.length}
                  </button>
                )}
              </div>
            )}
            {!item.waiting && (
              <div className="maint-explain">
                A data vem sugerida (o fim do ciclo atual) e pode ser mudada. Ao clicar em <strong>Feito</strong> (ele pergunta antes) o Ciclo {cicloAtual.n} fecha nessa
                data e o Ciclo {cicloAtual.n + 1} já começa a contar dela. Para registrar km, valor ou anotação, use <strong>Editar ciclo</strong>.
              </div>
            )}
          </div>
          <div className="maint-secao">
          <div className="maint-secao-titulo">Prazo</div>
          <div className="prop-list">
            <label className="prop-row">
              <span className="prop-label">A cada (meses)</span>
              <div className="prop-value">
                <input
                  type="number"
                  min={0}
                  placeholder="—"
                  defaultValue={item.intervalMonths ?? ""}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    board.updateMaintenanceItem(item.id, {
                      intervalMonths: Number.isFinite(v) && v > 0 ? v : null,
                    });
                  }}
                />
              </div>
            </label>
            {asset.tracksOdometer && (
              <label className="prop-row">
                <span className="prop-label">A cada ({asset.odometerUnit})</span>
                <div className="prop-value">
                  <input
                    type="number"
                    min={0}
                    placeholder="—"
                    defaultValue={item.intervalDistance ?? ""}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      board.updateMaintenanceItem(item.id, {
                        intervalDistance: Number.isFinite(v) && v > 0 ? v : null,
                      });
                    }}
                  />
                </div>
              </label>
            )}
          </div>

          {/* Ciclo que só começa depois de algo acontecer (ex.: refazer o exame
              3 meses depois de começar a suplementação, e a suplementação só
              começa quando a compra chega). */}
          <div className="prop-list">
            <div className="prop-row">
              <span className="prop-label">Aguardando começar</span>
              <div className="prop-value">
                <label className="challenging-toggle">
                  <ToggleSwitch
                    checked={item.waiting}
                    ariaLabel="Aguardando começar"
                    onChange={(v) =>
                      board.updateMaintenanceItem(item.id, v ? { waiting: true } : { waiting: false, cycleStartOn: item.cycleStartOn ?? todayISO() })
                    }
                  />
                  <span className="challenging-hint">
                    {item.waiting ? "Não conta prazo nem avisa. Clique em Começar quando chegar." : "Ligue quando comprou e ainda não chegou"}
                  </span>
                </label>
              </div>
            </div>
            {!item.waiting && (
              <label className="prop-row">
                <span className="prop-label">Início do ciclo atual</span>
                <div className="prop-value">
                  <input
                    type="date"
                    defaultValue={item.cycleStartOn ?? ""}
                    onBlur={(e) => board.updateMaintenanceItem(item.id, { cycleStartOn: e.target.value || null })}
                  />
                </div>
              </label>
            )}
          </div>
          {asset.tracksOdometer && (
            <div className="maint-explain">
              Preencha os dois quando o serviço vencer por tempo <strong>ou</strong> por {asset.odometerUnit} — o FARO usa o que chegar primeiro. Deixe um vazio se só um vale.
            </div>
          )}
          {st.dueDateByTime && st.dueDateByUse && (
            <div className="maint-explain">
              Por tempo venceria {fmtShortDate(st.dueDateByTime)}; pelo uso, {fmtShortDate(st.dueDateByUse)}. Vale o que vem primeiro.
            </div>
          )}
          </div>

          <div className="maint-secao">
          <div className="maint-secao-titulo">Anotações</div>
          <label className="prop-row prop-row-empilhada">
            <span className="prop-label">Observação</span>
            <div className="prop-value maint-msg">
              <CommentButton
                variant="field"
                alwaysExpanded
                value={item.observation}
                placeholder="O que é isso, o que o médico explicou…"
                ariaLabel={`Observação de ${item.name}`}
                onSave={(text) => board.updateMaintenanceItem(item.id, { observation: text })}
              />
            </div>
          </label>

          </div>

          <div className="maint-secao maint-momentos">
            <div className="maint-secao-titulo">Quando o FARO avisa</div>
            <div className="maint-explain">
              O aviso no celular chega sempre. Em cada momento, o <BellIcon /> liga o aviso também dentro do app e o{" "}
              <WhatsAppIcon /> liga o WhatsApp.
            </div>

            <div className="maint-momento">
              <div className="maint-momento-texto">
                <strong>Comprar</strong>
                <span className="maint-linha-dias">
                  <input
                    type="number"
                    min={0}
                    placeholder="—"
                    aria-label="Dias antes do vencimento para avisar da compra"
                    defaultValue={item.buyDaysBefore ?? ""}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      board.updateMaintenanceItem(item.id, { buyDaysBefore: Number.isFinite(v) && v > 0 ? Math.round(v) : null });
                    }}
                  />
                  dias antes do vencimento
                </span>
                <span className="maint-momento-dica">
                  {item.buyDaysBefore
                    ? st.dueDate
                      ? `avisa em ${fmtShortDate(isoAddDays(st.dueDate, -item.buyDaysBefore))}.`
                      : "avisa quando houver uma data de vencimento."
                    : "Só pra item que precisa de peça ou compra (filtro, por exemplo). Vazio = sem aviso de compra."}
                </span>
              </div>
              {item.buyDaysBefore ? (
                item.boughtOn ? (
                  <button
                    type="button"
                    className="btn btn-ghost maint-done-btn concluido"
                    onClick={() => board.updateMaintenanceItem(item.id, { boughtOn: null })}
                    title="Desfazer: voltar a avisar da compra"
                  >
                    <CheckIcon /> Comprado <span className="maint-done-data mono">{fmtShortDate(item.boughtOn)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost maint-done-btn"
                    onClick={() => board.updateMaintenanceItem(item.id, { boughtOn: todayISO() })}
                  >
                    <CheckIcon /> Comprei
                  </button>
                )
              ) : null}
              <span className="maint-momento-icones">
                <button
                  type="button"
                  className={"icon-btn bell-btn" + (item.appBuy && item.buyDaysBefore && !item.boughtOn ? " active" : "")}
                  disabled={!item.buyDaysBefore || !!item.boughtOn}
                  title={item.appBuy ? "Aviso de compra também dentro do app. Clique pra desligar." : "Avisar a compra também dentro do app"}
                  aria-label="Sininho: aviso de compra dentro do app"
                  onClick={() => board.updateMaintenanceItem(item.id, { appBuy: !item.appBuy })}
                >
                  <BellIcon filled={!!(item.appBuy && item.buyDaysBefore && !item.boughtOn)} />
                </button>
                <button
                  type="button"
                  className={"icon-btn zap-btn" + (item.whatsappBuy && item.buyDaysBefore && !item.boughtOn ? " active" : "")}
                  disabled={!item.buyDaysBefore || !!item.boughtOn}
                  title={
                    item.boughtOn
                      ? "Já comprado: não avisa mais. No próximo ciclo o aviso volta sozinho, se estiver ligado."
                      : item.whatsappBuy
                        ? "Aviso de compra também no WhatsApp. Clique pra desligar."
                        : "Avisar a compra também no WhatsApp"
                  }
                  onClick={() => board.updateMaintenanceItem(item.id, { whatsappBuy: !item.whatsappBuy })}
                >
                  <WhatsAppIcon filled={!!(item.whatsappBuy && item.buyDaysBefore && !item.boughtOn)} />
                </button>
              </span>
            </div>

            <div className="maint-momento">
              <div className="maint-momento-texto">
                <strong>Fazer</strong>
                <span className="maint-linha-dias">
                  <input
                    type="number"
                    min={0}
                    placeholder="—"
                    aria-label="Dias antes do vencimento para avisar"
                    defaultValue={item.alertDaysBefore}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 0) board.updateMaintenanceItem(item.id, { alertDaysBefore: Math.round(v) });
                    }}
                  />
                  dias antes do vencimento
                </span>
                <span className="maint-momento-dica">e também no dia em que vence.</span>
              </div>
              <span className="maint-momento-icones">
                <button
                  type="button"
                  className={"icon-btn bell-btn" + (item.appDo ? " active" : "")}
                  title={item.appDo ? "Aviso de fazer também dentro do app. Clique pra desligar." : "Avisar também dentro do app"}
                  aria-label="Sininho: aviso de fazer dentro do app"
                  onClick={() => board.updateMaintenanceItem(item.id, { appDo: !item.appDo })}
                >
                  <BellIcon filled={item.appDo} />
                </button>
                <button
                  type="button"
                  className={"icon-btn zap-btn" + (item.whatsapp && st.dueDate ? " active" : "")}
                  disabled={!st.dueDate}
                  title={item.whatsapp ? "Aviso de fazer também no WhatsApp. Clique pra desligar." : "Avisar também no WhatsApp"}
                  onClick={() => board.setMaintenanceWhatsapp(item.id, !item.whatsapp)}
                >
                  <WhatsAppIcon filled={!!(item.whatsapp && st.dueDate)} />
                </button>
              </span>
            </div>

            <div className="maint-momento">
              <div className="maint-momento-texto">
                <strong>Venceu e não fiz</strong>
                <span className="maint-momento-dica">
                  Insiste 3 vezes: no dia seguinte, 2 dias depois e mais 4 dias depois. Para quando você marca
                  &quot;Feito&quot;.
                </span>
              </div>
              {st.state === "vencido" && (
                <button
                  type="button"
                  className="btn btn-ghost maint-done-btn"
                  title="Ainda não deu pra fazer: a insistência recomeça a contar de hoje"
                  onClick={() => board.updateMaintenanceItem(item.id, { overdueFrom: todayISO() })}
                >
                  Lembrar de novo
                </button>
              )}
              <span className="maint-momento-icones">
                <button
                  type="button"
                  className={"icon-btn bell-btn" + (item.appOverdue ? " active" : "")}
                  title={item.appOverdue ? "A insistência também aparece dentro do app. Clique pra desligar." : "Insistir também dentro do app"}
                  aria-label="Sininho: insistência dentro do app"
                  onClick={() => board.updateMaintenanceItem(item.id, { appOverdue: !item.appOverdue })}
                >
                  <BellIcon filled={item.appOverdue} />
                </button>
                <button
                  type="button"
                  className={"icon-btn zap-btn" + (item.whatsappOverdue && st.dueDate ? " active" : "")}
                  disabled={!st.dueDate}
                  title={item.whatsappOverdue ? "A insistência também vai pro WhatsApp. Clique pra desligar." : "Insistir também no WhatsApp"}
                  onClick={() => board.updateMaintenanceItem(item.id, { whatsappOverdue: !item.whatsappOverdue })}
                >
                  <WhatsAppIcon filled={!!(item.whatsappOverdue && st.dueDate)} />
                </button>
              </span>
            </div>

          {/* Este campo começou como "Anotações" e virou a MENSAGEM. Ele
              percebeu que o "Fiz" já guarda observação por serviço, então o
              campo do item estava duplicando — e o que faltava mesmo era
              escolher o texto que chega no celular. Vazio, a mensagem cai no
              padrão "Manutenção: <nome do item>". */}
          {/* Esta linha é a única do painel em que o valor é texto longo, e na
              grade de duas colunas ele ficava espremido contra o rótulo. Vira
              empilhada: rótulo em cima, caixa inteira embaixo. */}
          <label className="prop-row prop-row-empilhada">
            <span className="prop-label">Mensagem no WhatsApp</span>
            <div className="prop-value maint-msg">
              <CommentButton
                variant="field"
                alwaysExpanded
                value={item.note}
                placeholder={`Vazio, chega como "Manutenção: ${item.name}"`}
                ariaLabel={`Mensagem de ${item.name} no WhatsApp`}
                onSave={(text) => board.updateMaintenanceItem(item.id, { note: text })}
              />
            </div>
          </label>
          </div>

          {historico.length > 0 && (
            <div className="maint-history maint-secao">
              <div className="maint-secao-titulo">Rodadas já feitas</div>
              {[...rodadas].reverse().map((r) => {
                const s = historico.find((h) => h.id === r.serviceId)!;
                return (
                  <div className="maint-history-row" key={r.serviceId}>
                    <strong className="maint-rodada-n">Ciclo {r.n}</strong>
                    {r.inicio && r.fimPrevisto && (
                      <span className="mono maint-rodada-datas">
                        {fmtShortDate(r.inicio)} a {fmtShortDate(r.fimPrevisto)}
                      </span>
                    )}
                    <span className="mono maint-rodada-feito">feito em {fmtShortDate(s.doneOn)}</span>
                    {s.odometer !== null && (
                      <span className="mono maint-history-km">
                        {fmtKm(s.odometer)} {asset.odometerUnit}
                      </span>
                    )}
                    {s.costCents !== null && <span className="mono maint-history-cost">{fmtBRL(s.costCents)}</span>}
                    {s.note && <span className="maint-history-note">{s.note}</span>}
                    <span className="maint-history-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Corrigir este serviço"
                        aria-label={`Corrigir o serviço de ${fmtShortDate(s.doneOn)}`}
                        onClick={() =>
                          askConfirm(
                            `Tem certeza que quer mudar o Ciclo ${r.n}? Ele já passou. O seu ciclo atual é o Ciclo ${cicloAtual.n}.`,
                            () => abrirForm(s)
                          )
                        }
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger-hover"
                        title="Apagar este serviço do histórico"
                        aria-label={`Apagar o serviço de ${fmtShortDate(s.doneOn)}`}
                        onClick={() =>
                          askConfirm(`Apagar o serviço de ${fmtShortDate(s.doneOn)} do histórico?`, () =>
                            board.deleteMaintenanceService(s.id)
                          )
                        }
                      >
                        <TrashIcon />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="edit-actions">
            <button
              type="button"
              className="btn btn-ghost danger-hover"
              onClick={() =>
                askConfirm(`Excluir "${item.name}"? O histórico desse item vai junto.`, () =>
                  board.deleteMaintenanceItem(item.id)
                )
              }
            >
              <TrashIcon /> Excluir item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset }: { asset: MaintenanceAsset }) {
  const { board, askConfirm } = useBoardCtx();
  const [novoItem, setNovoItem] = useState("");
  const [nomeDraft, setNomeDraft] = useState<string | null>(null);
  // Nasce recolhido: com dois ou três veículos cadastrados, tudo aberto vira
  // um paredão e não dá pra achar nada.
  const [aberto, setAberto] = useState(false);
  const [lendoOdometro, setLendoOdometro] = useState(false);
  const [leitura, setLeitura] = useState("");

  const itens = board.state.maintenanceItems
    .filter((i) => i.assetId === asset.id && i.active)
    .sort((a, b) => a.order - b.order);
  const readings = board.state.odometerReadings.filter((r) => r.assetId === asset.id);
  const atual = lastReading(readings);
  const ritmo = distancePerDay(readings);
  const precisaConferir = odometerCheckDue(asset, readings);
  const sugestoes = MAINTENANCE_SUGGESTIONS[asset.kind] ?? [];
  const jaTem = new Set(itens.map((i) => i.name));
  const vencidos = itens.filter(
    (i) => maintenanceStatus(i, asset, readings).state === "vencido"
  ).length;

  function salvarLeitura() {
    const km = Number(leitura.replace(/\D/g, ""));
    if (!Number.isFinite(km) || km <= 0) return;
    board.addOdometerReading(asset.id, km, todayISO());
    setLeitura("");
    setLendoOdometro(false);
  }

  const proximos = itens.filter((i) => maintenanceStatus(i, asset, readings).state === "proximo").length;

  function adicionarItem() {
    if (!novoItem.trim()) return;
    board.addMaintenanceItem(asset.id, novoItem, null, null);
    setNovoItem("");
  }

  return (
    <div
      className={"maint-asset com-filete" + (aberto ? " open" : "")}
      style={{ "--k": vencidos > 0 ? "#E5484D" : proximos > 0 ? "#C28A1E" : itens.length > 0 ? "#2F9E44" : "#8A8A94" } as React.CSSProperties}
    >
      <div className="maint-asset-head">
        <button
          type="button"
          className="synapse-card-toggle"
          aria-expanded={aberto}
          aria-label={aberto ? "Recolher" : "Abrir"}
          onClick={() => setAberto((v) => !v)}
        >
          <ChevronIcon />
        </button>
        {/* O ícone também abre e fecha — é o alvo grande, fácil de acertar no
            celular. */}
        <button
          type="button"
          className="maint-asset-icon tile-tipo"
          aria-label={aberto ? "Recolher" : "Abrir"}
          onClick={() => setAberto((v) => !v)}
        >
          <KindIcon kind={asset.kind} />
        </button>
        {/* Recolhido o nome é botão (clicar abre); aberto vira campo, pra
            continuar dando pra renomear. */}
        <span className="maint-asset-nomecol">
        {aberto ? (
          <input
            type="text"
            className="maint-asset-name"
            value={nomeDraft ?? asset.name}
            aria-label="Nome"
            onChange={(e) => setNomeDraft(e.target.value)}
            onBlur={() => {
              const novo = nomeDraft?.trim();
              if (novo && novo !== asset.name) board.updateMaintenanceAsset(asset.id, { name: novo });
              setNomeDraft(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        ) : (
          <button type="button" className="maint-asset-name as-button" onClick={() => setAberto(true)}>
            {asset.name}
          </button>
        )}
        {!aberto && (
          <span className="maint-asset-sub">
            {itens.length === 0 ? "nenhum item ainda" : `${itens.length} ${itens.length === 1 ? "item" : "itens"}`}
            {asset.tracksOdometer && atual ? ` · ${fmtKm(atual.reading)} ${asset.odometerUnit}` : ""}
          </span>
        )}
        </span>
        {vencidos > 0 && <span className="maint-flag vencido">{vencidos} vencido(s)</span>}
        {!aberto && vencidos === 0 && proximos > 0 && (
          <span className="maint-flag proximo">{proximos} chegando</span>
        )}
        {!aberto && vencidos === 0 && proximos === 0 && itens.length > 0 && <span className="maint-flag em-dia">em dia</span>}
        {!aberto && precisaConferir && asset.tracksOdometer && (
          <span className="maint-flag proximo">conferir {asset.odometerUnit}</span>
        )}
        {aberto && asset.tracksOdometer && atual && (
          <span className="maint-odometer mono">
            {fmtKm(atual.reading)} {asset.odometerUnit}
            {ritmo ? ` · ~${Math.round(ritmo)} ${asset.odometerUnit}/dia` : ""}
          </span>
        )}
        {aberto && (
          <select
            className="budget-input maint-kind-select"
            value={asset.kind}
            aria-label="Tipo (muda o ícone)"
            title="Tipo (muda o ícone)"
            onChange={(e) => {
              const kind = e.target.value as MaintenanceAsset["kind"];
              // Só veículo tem odômetro: ao sair de veículo ele desliga, ao voltar liga.
              board.updateMaintenanceAsset(asset.id, { kind, tracksOdometer: kind === "veiculo" });
            }}
          >
            {(Object.keys(KIND_LABEL) as MaintenanceAsset["kind"][]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        )}
        {aberto && (
          <button
            type="button"
            className="icon-btn danger-hover"
            title="Excluir"
            onClick={() =>
              askConfirm(`Excluir "${asset.name}" e todos os itens de manutenção dele?`, () =>
                board.deleteMaintenanceAsset(asset.id)
              )
            }
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {aberto && asset.tracksOdometer && (
        <div className={"maint-odo-box" + (precisaConferir ? " due" : "")}>
          {lendoOdometro ? (
            <div className="maint-odo-form">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder={`${asset.odometerUnit} de hoje`}
                value={leitura}
                onChange={(e) => setLeitura(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarLeitura()}
              />
              <button type="button" className="btn btn-accent" onClick={salvarLeitura}>
                Salvar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setLendoOdometro(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <span className="maint-odo-text">
                {!atual
                  ? "Sem leitura do odômetro — sem ela não dá pra prever o vencimento por km."
                  : precisaConferir
                    ? `Última leitura em ${fmtShortDate(atual.readOn)}. Hora de conferir o ${asset.odometerUnit}.`
                    : `Odômetro conferido em ${fmtShortDate(atual.readOn)}.`}
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => setLendoOdometro(true)}>
                Anotar {asset.odometerUnit}
              </button>
            </>
          )}
          <label className="maint-odo-every">
            lembrar a cada
            <input
              type="number"
              min={0}
              defaultValue={asset.odometerReminderDays ?? ""}
              onBlur={(e) => {
                const v = Number(e.target.value);
                board.updateMaintenanceAsset(asset.id, {
                  odometerReminderDays: Number.isFinite(v) && v > 0 ? v : null,
                });
              }}
            />
            dias
          </label>
        </div>
      )}

      {aberto && (
        <div className="maint-items">
          {itens.map((i) => (
            <ItemRow key={i.id} item={i} asset={asset} />
          ))}
          {!itens.length && <div className="hp-empty">Nenhum item ainda. Escolha abaixo ou escreva o seu.</div>}
        </div>
      )}

      {aberto && sugestoes.filter((s) => !jaTem.has(s.name)).length > 0 && (
        <div className="maint-suggestions">
          <span className="prop-label">Adicionar rápido</span>
          <div className="maint-suggestion-row">
            {sugestoes
              .filter((s) => !jaTem.has(s.name))
              .map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="maint-suggestion"
                  title={[
                    s.months ? `a cada ${s.months} meses` : null,
                    s.distance ? `a cada ${fmtKm(s.distance)} ${asset.odometerUnit}` : null,
                  ]
                    .filter(Boolean)
                    .join(" ou ")}
                  onClick={() =>
                    board.addMaintenanceItem(asset.id, s.name, s.months ?? null, s.distance ?? null)
                  }
                >
                  + {s.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {aberto && (
        <div className="quickadd-row maint-quickadd">
          <span className="quickadd-plus" aria-hidden="true">
            +
          </span>
          <input
            type="text"
            className="quickadd-input"
            placeholder="Outro item de manutenção e pressionar Enter"
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") adicionarItem();
            }}
          />
          <MicButton onText={(t) => setNovoItem((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o item" />
          <EnviarBtn onClick={adicionarItem} label="Adicionar o item" />
        </div>
      )}
    </div>
  );
}

export function MaintenanceView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [novo, setNovo] = useState("");
  const [tipo, setTipo] = useState<MaintenanceAsset["kind"]>("veiculo");

  async function adicionar() {
    const nome = novo.trim();
    if (!nome) return;
    setNovo("");
    const id = await board.addMaintenanceAsset(nome, tipo);
    if (!id) setNovo(nome);
  }

  const assets = board.state.maintenanceAssets;

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Manutenção</span>
        <TutorialLink secao="manutencao" />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <CarIcon /> O que precisa ficar em dia
          </div>
          <p>
            Registre quando fez e o FARO calcula quando vence a próxima — <strong>por tempo, por {"km"} ou
            pelos dois</strong>, valendo o que chegar primeiro. Pra prever o vencimento por km, ele precisa que
            você anote o odômetro de vez em quando.
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
              placeholder="Novo (ex.: Civic, Moto, Apartamento) e pressionar Enter"
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
            />
            <select
              className="budget-input maint-kind-select"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MaintenanceAsset["kind"])}
            >
              {(Object.keys(KIND_LABEL) as MaintenanceAsset["kind"][]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <EnviarBtn onClick={() => adicionar()} label="Adicionar" />
          </div>
        </div>

        {!assets.length && (
          <div className="list-card">
            <div className="hp-empty">Nada cadastrado ainda. Comece pelo carro ou pela casa.</div>
          </div>
        )}

        <div className="maint-list">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
