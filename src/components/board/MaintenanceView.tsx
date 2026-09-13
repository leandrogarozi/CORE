"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { MicButton } from "./MicButton";
import { CarIcon, CheckIcon, ChevronIcon, HomeIcon, TrashIcon, WarningIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import {
  MAINTENANCE_SUGGESTIONS,
  distancePerDay,
  lastReading,
  maintenanceStatus,
  odometerCheckDue,
} from "@/lib/board/maintenance";
import { fmtShortDate, todayISO } from "@/lib/date-utils";
import { fmtBRL, parseAmountToCents } from "@/lib/money";
import type { MaintenanceAsset, MaintenanceItem } from "@/lib/types";

const KIND_LABEL: Record<MaintenanceAsset["kind"], string> = {
  veiculo: "Veículo",
  casa: "Casa",
  outro: "Outro",
};

function fmtKm(n: number): string {
  return n.toLocaleString("pt-BR");
}

// Linha de um item: o que interessa é quando vence e por quê.
function ItemRow({ item, asset }: { item: MaintenanceItem; asset: MaintenanceAsset }) {
  const { board, askConfirm } = useBoardCtx();
  const [registrando, setRegistrando] = useState(false);
  const [aberto, setAberto] = useState(false);
  // Rascunho do nome: grava ao sair do campo, pra não mandar uma escrita por
  // tecla digitada.
  const [nomeDraft, setNomeDraft] = useState<string | null>(null);
  const [doneOn, setDoneOn] = useState(() => todayISO());
  const [odometro, setOdometro] = useState("");
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");

  const readings = board.state.odometerReadings.filter((r) => r.assetId === asset.id);
  const st = maintenanceStatus(item, asset, readings);
  const historico = board.state.maintenanceServices.filter((s) => s.itemId === item.id);

  function registrar() {
    const km = odometro.trim() === "" ? null : Number(odometro.replace(/\D/g, ""));
    const custo = valor.trim() === "" ? null : parseAmountToCents(valor);
    board.registerMaintenanceService(item.id, doneOn, km, custo, nota);
    setRegistrando(false);
    setOdometro("");
    setValor("");
    setNota("");
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
        {st.state === "vencido" && (
          <span className="maint-flag vencido">
            <WarningIcon /> vencido
          </span>
        )}
        {st.state === "proximo" && <span className="maint-flag proximo">chegando</span>}
        {/* O intervalo fica à vista: ele estava só dentro do item aberto, e o
            Leandro não achou onde trocar 10.000 por 16.000 km. Clicar abre
            direto o lugar de editar. */}
        <button
          type="button"
          className={"maint-interval" + (intervalo === null ? " vazio" : "")}
          title="Clique pra mudar o intervalo"
          onClick={() => setAberto(true)}
        >
          {intervalo ?? "definir intervalo"}
        </button>
        <span className="maint-item-resumo">{resumo}</span>
        <button
          type="button"
          className="btn btn-ghost maint-done-btn"
          onClick={() => setRegistrando((v) => !v)}
        >
          <CheckIcon /> Fiz
        </button>
      </div>

      {registrando && (
        <div className="maint-register">
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
            <button type="button" className="btn btn-accent" onClick={registrar}>
              Registrar serviço
            </button>
          </div>
        </div>
      )}

      {aberto && (
        <div className="maint-item-body">
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
            <label className="prop-row">
              <span className="prop-label">Avisar (dias antes)</span>
              <div className="prop-value">
                <input
                  type="number"
                  min={0}
                  defaultValue={item.alertDaysBefore}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0) board.updateMaintenanceItem(item.id, { alertDaysBefore: v });
                  }}
                />
              </div>
            </label>
          </div>

          <div className="maint-explain">
            Preencha os dois quando o serviço vencer por tempo <strong>ou</strong> por{" "}
            {asset.odometerUnit} — o FARO usa o que chegar primeiro. Deixe um vazio se só um vale.
          </div>
          {st.dueDateByTime && st.dueDateByUse && (
            <div className="maint-explain">
              Por tempo venceria {fmtShortDate(st.dueDateByTime)}; pelo uso, {fmtShortDate(st.dueDateByUse)}.
              Vale o que vem primeiro.
            </div>
          )}

          {historico.length > 0 && (
            <div className="maint-history">
              <span className="prop-label">Histórico</span>
              {historico.slice(0, 6).map((s) => (
                <div className="maint-history-row" key={s.id}>
                  <span className="mono">{fmtShortDate(s.doneOn)}</span>
                  {s.odometer !== null && (
                    <span className="mono maint-history-km">
                      {fmtKm(s.odometer)} {asset.odometerUnit}
                    </span>
                  )}
                  {s.costCents !== null && (
                    <span className="mono maint-history-cost">{fmtBRL(s.costCents)}</span>
                  )}
                  {s.note && <span className="maint-history-note">{s.note}</span>}
                </div>
              ))}
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

  return (
    <div className="maint-asset">
      <div className="maint-asset-head">
        <span className="maint-asset-icon">{asset.kind === "casa" ? <HomeIcon /> : <CarIcon />}</span>
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
        {vencidos > 0 && <span className="maint-flag vencido">{vencidos} vencido(s)</span>}
        {asset.tracksOdometer && atual && (
          <span className="maint-odometer mono">
            {fmtKm(atual.reading)} {asset.odometerUnit}
            {ritmo ? ` · ~${Math.round(ritmo)} ${asset.odometerUnit}/dia` : ""}
          </span>
        )}
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
      </div>

      {asset.tracksOdometer && (
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

      <div className="maint-items">
        {itens.map((i) => (
          <ItemRow key={i.id} item={i} asset={asset} />
        ))}
        {!itens.length && <div className="hp-empty">Nenhum item ainda. Escolha abaixo ou escreva o seu.</div>}
      </div>

      {sugestoes.filter((s) => !jaTem.has(s.name)).length > 0 && (
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
            if (e.key !== "Enter" || !novoItem.trim()) return;
            board.addMaintenanceItem(asset.id, novoItem, null, null);
            setNovoItem("");
          }}
        />
        <MicButton onText={(t) => setNovoItem((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o item" />
      </div>
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
        <span style={{ width: 30 }} />
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
