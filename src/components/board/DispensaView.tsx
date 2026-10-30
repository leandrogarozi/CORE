"use client";

import { useState, type CSSProperties } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { BellIcon, CartIcon, CheckIcon, ChevronIcon, TrashIcon } from "./icons";
import { TutorialLink } from "./TutorialLink";
import { EmConstrucao } from "./EmConstrucao";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import {
  CATEGORIAS_DA_DISPENSA,
  ROTULO_DA_SITUACAO,
  aposComprar,
  ehRemedioOuSaude,
  lembreteDeCompraPendente,
  precisaComprar,
  situacaoDaValidade,
  tituloDoLembreteDeCompra,
} from "@/lib/board/dispensa";
import { fmtShortDate, isoAddDays, todayISO } from "@/lib/date-utils";
import { fmtBRL, parseAmountToCents } from "@/lib/money";
import type { PantryItem, PantryStatus } from "@/lib/types";

type Filtro = "tudo" | "comprar" | "vence" | "vender";

const COR_DA_SITUACAO: Record<PantryStatus, string> = { ok: "#3E8E5A", low: "#C28A1E", out: "#C0392B" };
const PROXIMA: Record<PantryStatus, PantryStatus> = { ok: "low", low: "out", out: "ok" };

/**
 * Quantidade da linha (versão C do desenho): frasco medido em % mostra uma barrinha de nível (tocar nela escolhe
 * 0, 25, 50, 75 ou 100) e o número; item contado mostra só o número. Tocar no número abre para digitar.
 */
function Quantidade({ valor, unidade, emPorcento, cor, onChange }: { valor: number; unidade: string; emPorcento: boolean; cor: string; onChange: (n: number) => void }) {
  const [editando, setEditando] = useState(false);
  return (
    <span className="disp-qtd">
      {emPorcento && (
        <span className="disp-nivel" role="img" aria-label={`Nível: ${valor}%`}>
          <i style={{ width: `${Math.min(100, valor)}%`, background: cor }} />
        </span>
      )}
      {editando ? (
        <input
          type="number"
          min={0}
          max={emPorcento ? 100 : 9999}
          className="disp-qtd-input"
          autoFocus
          defaultValue={valor}
          aria-label="Quantidade"
          onBlur={(e) => {
            setEditando(false);
            const n = Math.round(Number(e.target.value));
            if (Number.isFinite(n)) onChange(n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditando(false);
          }}
        />
      ) : (
        <button type="button" className="disp-qtd-num" title="Tocar para editar" onClick={() => setEditando(true)}>
          {valor}
          {emPorcento ? "%" : unidade ? ` ${unidade}` : ""}
        </button>
      )}
    </span>
  );
}

/** Cor do nível: verde = cheio, amarelo = atenção, vermelho = acabando ou acabou. */
function corDoNivel(item: PantryItem): string {
  if (item.status !== "ok" || item.quantity <= 0) return "#C0392B";
  if (item.unit === "%") return item.quantity >= 60 ? "#3E8E5A" : item.quantity >= 30 ? "#C28A1E" : "#C0392B";
  return "#3E8E5A";
}

function Linha({ item, aberto, onAbrir }: { item: PantryItem; aberto: boolean; onAbrir: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const hoje = todayISO();
  const validade = situacaoDaValidade(item, hoje);
  const comprar = precisaComprar(item);
  const cor = validade?.tipo === "vencido" ? COR_DA_SITUACAO.out : COR_DA_SITUACAO[item.status];
  const itensManutencao = board.state.maintenanceItems.filter((m) => m.active);
  const ligado = itensManutencao.find((m) => m.id === item.maintenanceItemId);
  const salvar = (patch: Partial<Omit<PantryItem, "id">>) => board.updatePantryItem(item.id, patch);

  // Itens medidos em % (nível do frasco) andam de 10 em 10 e vão até 100.
  const emPorcento = item.unit === "%";
  function mudarQuantidade(n: number) {
    const q = Math.min(emPorcento ? 100 : 9999, Math.max(0, n));
    if (q === item.quantity) return;
    // Zerou: acabou. Voltou a ter e estava "acabou": tem de novo.
    if (q === 0) salvar({ quantity: 0, status: "out" });
    else if (item.status === "out") salvar({ quantity: q, status: "ok" });
    else salvar({ quantity: q });
  }

  const [nasCompras, setNasCompras] = useState(false);
  const lembrete = lembreteDeCompraPendente(board.state.reminders, item.name);
  const [criandoLembrete, setCriandoLembrete] = useState(false);
  const [lemData, setLemData] = useState(() => isoAddDays(todayISO(), 1));
  const [lemHora, setLemHora] = useState("09:00");
  async function criarLembrete() {
    const ok = await board.addReminder(tituloDoLembreteDeCompra(item.name), lemData, lemHora);
    if (ok) setCriandoLembrete(false);
  }
  // Comprou: volta a "tenho" e o lembrete de compra, se havia, é concluído.
  function comprei() {
    salvar(aposComprar(item));
    if (lembrete) board.completeReminder(lembrete.id);
  }
  function paraAsCompras() {
    void board.addShoppingItem("compra", item.name, null);
    setNasCompras(true);
  }

  const sub = [item.category, item.place].filter(Boolean).join(" · ");
  const campo = (rotulo: string, dica: string | null, controle: React.ReactNode) => (
    <div className="meta-linha">
      <div className="meta-linha-rotulo">
        <b>{rotulo}</b>
        {dica && <span>{dica}</span>}
      </div>
      <div className="meta-linha-controle">{controle}</div>
    </div>
  );
  // Texto livre: grava ao sair do campo, não a cada tecla.
  const texto = (valor: string, onSave: (v: string) => void, props: { placeholder?: string; list?: string; label: string }) => (
    <input
      key={valor}
      className="settings-input disp-input"
      defaultValue={valor}
      placeholder={props.placeholder}
      list={props.list}
      aria-label={props.label}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v !== valor) onSave(v);
      }}
    />
  );

  return (
    <div className={"disp-linha" + (aberto ? " open" : "")} style={{ "--k": cor } as CSSProperties}>
      <div className="disp-topo">
        <button type="button" className="disp-abrir" onClick={onAbrir} aria-expanded={aberto}>
          <span className="disp-textos">
            <span className="disp-nome">{item.name}</span>
            {sub && <span className="disp-sub">{sub}</span>}
          </span>
        </button>
        <span className="disp-chips">
          {validade && (
            <span className={"disp-chip " + (validade.tipo === "vencido" ? "ruim" : "aviso")}>
              {validade.tipo === "vencido" ? `vencido há ${-validade.dias} d` : `vence em ${validade.dias} d`}
            </span>
          )}
          {item.forSale && <span className="disp-chip venda">{item.salePriceCents ? `à venda · ${fmtBRL(item.salePriceCents)}` : "à venda"}</span>}
          {item.status !== "ok" && (
            <button
              type="button"
              className={"disp-chip situacao s-" + item.status}
              title="Tocar para mudar a situação"
              onClick={() => salvar({ status: PROXIMA[item.status] })}
            >
              {ROTULO_DA_SITUACAO[item.status]}
            </button>
          )}
        </span>
        <Quantidade
          valor={item.quantity}
          unidade={item.unit}
          emPorcento={emPorcento}
          cor={corDoNivel(item)}
          onChange={mudarQuantidade}
        />
      </div>

      {aberto && (
        <div className="disp-corpo">
          {comprar && (
            <div className="disp-aviso">
              <div className="disp-aviso-topo">
                <span>{item.status === "out" || item.quantity <= 0 ? "Acabou." : "Está acabando."} Quer comprar mais?</span>
                <span className="disp-aviso-acoes">
                  {!lembrete && !criandoLembrete && (
                    <button type="button" className="btn btn-ghost" onClick={() => setCriandoLembrete(true)}>
                      <BellIcon /> Criar lembrete para comprar
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={paraAsCompras} disabled={nasCompras}>
                    <CartIcon /> {nasCompras ? "Está nas Compras" : "Colocar nas Compras"}
                  </button>
                  <button type="button" className="btn btn-accent" onClick={comprei}>
                    <CheckIcon /> Comprei
                  </button>
                </span>
              </div>
              {lembrete && (
                <div className="hint-text">
                  Lembrete criado{lembrete.date ? ` para ${fmtShortDate(lembrete.date)}` : ""}
                  {lembrete.time ? ` às ${lembrete.time}` : ""}. Quando você marcar “Comprei” (ou disser ao FARO que comprou), ele é concluído.
                </div>
              )}
              {criandoLembrete && (
                <div className="disp-aviso-lembrete">
                  <input type="date" className="settings-input disp-data" value={lemData} onChange={(e) => setLemData(e.target.value)} aria-label="Dia do lembrete" />
                  <input type="time" className="settings-input disp-hora" value={lemHora} onChange={(e) => setLemHora(e.target.value)} aria-label="Hora do lembrete" />
                  <button type="button" className="btn btn-accent" onClick={criarLembrete} disabled={!lemData || !lemHora}>
                    Criar lembrete
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setCriandoLembrete(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
          {campo("Nome", null, texto(item.name, (v) => v && salvar({ name: v }), { label: "Nome" }))}
          {campo(
            "Quantidade",
            "Quando chegar a zero, vira “Acabou”.",
            <>
              <input
                key={item.quantity}
                type="number"
                min={0}
                className="settings-input disp-num"
                defaultValue={item.quantity}
                aria-label="Quantidade"
                onBlur={(e) => mudarQuantidade(Math.round(Number(e.target.value) || 0))}
              />
              <span className="disp-un">{texto(item.unit, (v) => salvar({ unit: v }), { placeholder: "un, kg, L...", label: "Unidade" })}</span>
            </>
          )}
          {campo(
            "Situação",
            "Acabando e Acabou avisam para comprar mais.",
            <div className="view-toggle disp-situacoes">
              {(["ok", "low", "out"] as PantryStatus[]).map((st) => (
                <button key={st} type="button" className={"view-toggle-btn" + (item.status === st ? " active" : "")} onClick={() => salvar({ status: st })}>
                  {ROTULO_DA_SITUACAO[st]}
                </button>
              ))}
            </div>
          )}
          {campo("Onde está", "Armário, gaveta, garagem...", texto(item.place, (v) => salvar({ place: v }), { label: "Onde está" }))}
          {campo(
            "Categoria",
            ehRemedioOuSaude(item) ? "Remédios ficam só aqui: o FARO não lê." : null,
            <>
              {texto(item.category, (v) => salvar({ category: v }), { list: "disp-categorias", label: "Categoria" })}
              <datalist id="disp-categorias">
                {CATEGORIAS_DA_DISPENSA.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
          {campo(
            "Validade",
            "O FARO avisa 30 dias antes.",
            <>
              <input
                type="date"
                className="settings-input disp-data"
                value={item.expiresOn ?? ""}
                aria-label="Validade"
                onChange={(e) => salvar({ expiresOn: e.target.value || null })}
              />
              {item.expiresOn && (
                <span className="hint-text">{fmtShortDate(item.expiresOn)}</span>
              )}
            </>
          )}
          {campo(
            "Ligado à Manutenção",
            "Uma peça que usa este item (ex.: refil do filtro).",
            <select
              className="settings-input disp-input"
              value={item.maintenanceItemId ?? ""}
              aria-label="Ligado à Manutenção"
              onChange={(e) => salvar({ maintenanceItemId: e.target.value || null })}
            >
              <option value="">Nenhum</option>
              {itensManutencao.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              {item.maintenanceItemId && !ligado && <option value={item.maintenanceItemId}>(item removido)</option>}
            </select>
          )}
          {campo(
            "Posso vender",
            "Aparece no filtro “Para vender”.",
            <>
              <label className="disp-check">
                <input type="checkbox" checked={item.forSale} onChange={(e) => salvar({ forSale: e.target.checked })} /> Para vender
              </label>
              {item.forSale && (
                <input
                  key={item.salePriceCents ?? "x"}
                  className="settings-input disp-num"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  defaultValue={item.salePriceCents ? (item.salePriceCents / 100).toFixed(2).replace(".", ",") : ""}
                  aria-label="Valor de venda"
                  onBlur={(e) => salvar({ salePriceCents: e.target.value.trim() ? parseAmountToCents(e.target.value) : null })}
                />
              )}
            </>
          )}
          {campo(
            "Anotações",
            null,
            <textarea
              key={item.note}
              className="settings-input disp-nota"
              rows={2}
              defaultValue={item.note}
              aria-label="Anotações"
              onBlur={(e) => e.target.value !== item.note && salvar({ note: e.target.value })}
            />
          )}
          <div className="disp-rodape">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => askConfirm(`Apagar “${item.name}” da dispensa?`, () => board.deletePantryItem(item.id))}
            >
              <TrashIcon /> Apagar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DispensaView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [novo, setNovo] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const hoje = todayISO();
  const todos = board.state.pantryItems;

  const total = (f: Filtro) =>
    todos.filter((i) => (f === "comprar" ? precisaComprar(i) : f === "vence" ? situacaoDaValidade(i, hoje) !== null : f === "vender" ? i.forSale : true)).length;
  const categorias = Array.from(new Set(todos.map((i) => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const q = busca.trim().toLowerCase();
  const ROTULO_SITUACAO: Record<Filtro, string> = { tudo: "Tudo", comprar: "Comprar", vence: "Vence logo", vender: "Para vender" };
  const rotuloDoFiltro = [filtro !== "tudo" ? ROTULO_SITUACAO[filtro] : null, categoria].filter(Boolean).join(" · ") || "Tudo";

  const visiveis = todos
    .filter((i) => {
      if (filtro === "comprar" && !precisaComprar(i)) return false;
      if (filtro === "vence" && situacaoDaValidade(i, hoje) === null) return false;
      if (filtro === "vender" && !i.forSale) return false;
      if (categoria && i.category !== categoria) return false;
      if (q && !(i.name + " " + i.place + " " + i.category).toLowerCase().includes(q)) return false;
      return true;
    })
    // O que pede atenção sobe: vencido, acabou, acabando; depois por nome.
    .sort((a, b) => {
      const peso = (i: PantryItem) => (situacaoDaValidade(i, hoje)?.tipo === "vencido" ? 0 : i.status === "out" ? 1 : i.status === "low" ? 2 : 3);
      return peso(a) - peso(b) || a.name.localeCompare(b.name, "pt-BR");
    });

  function adicionar() {
    if (!novo.trim()) return;
    board.addPantryItem(novo, categoria ? { category: categoria } : {});
    setNovo("");
  }

  const pilula = (id: Filtro, rotulo: string) => (
    <button key={id} type="button" className={"view-toggle-btn" + (filtro === id ? " active" : "")} onClick={() => setFiltro(id)}>
      {rotulo} {total(id)}
    </button>
  );

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Dispensa</span>
        <TutorialLink secao="dispensa" />
      </div>
      <EmConstrucao tela="A Dispensa" />
      <div className="hint-text" style={{ marginBottom: 12 }}>
        O que você tem guardado em casa: produto de piscina, refil de filtro, lâmpada, remédio, ferramenta. Marque quando estiver acabando e o FARO
        lembra de comprar. Pergunte a ele: “eu tenho tal produto na dispensa?”.
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="Adicionar item e pressionar Enter"
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
            />
            <EnviarBtn onClick={adicionar} label="Adicionar à dispensa" />
          </div>
        </div>

        {/* Um botão de filtro só (como o de cor da Metanoia): abre as opções de situação e de categoria. */}
        <div className="disp-filtro">
          <button type="button" className="btn btn-ghost disp-filtro-botao" aria-expanded={filtroAberto} onClick={() => setFiltroAberto((v) => !v)}>
            <span>Filtrar</span>
            <b>{rotuloDoFiltro}</b>
            <ChevronIcon />
          </button>
          {(filtro !== "tudo" || categoria) && (
            <button type="button" className="link-acao" onClick={() => { setFiltro("tudo"); setCategoria(null); }}>
              Limpar filtro
            </button>
          )}
        </div>
        {filtroAberto && (
          <div className="disp-filtro-painel">
            <div className="disp-filtro-grupo">
              <span className="disp-filtro-titulo">Situação</span>
              <div className="view-toggle disp-filtros">
                {pilula("tudo", "Tudo")}
                {pilula("comprar", "Comprar")}
                {pilula("vence", "Vence logo")}
                {pilula("vender", "Para vender")}
              </div>
            </div>
            {categorias.length > 0 && (
              <div className="disp-filtro-grupo">
                <span className="disp-filtro-titulo">Categoria</span>
                <div className="disp-categorias-linha">
                  <button type="button" className={"disp-cat" + (categoria === null ? " active" : "")} onClick={() => setCategoria(null)}>
                    Todas
                  </button>
                  {categorias.map((c) => (
                    <button key={c} type="button" className={"disp-cat" + (categoria === c ? " active" : "")} onClick={() => setCategoria(categoria === c ? null : c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {todos.length > 6 && (
          <input type="search" className="settings-input disp-busca" placeholder="Buscar na dispensa" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar na dispensa" />
        )}

        <div className="list-card disp-lista">
          {visiveis.length === 0 ? (
            <div className="hp-empty">{todos.length === 0 ? "Nada na dispensa ainda. Comece pelo que você já tem em casa." : "Nada neste filtro."}</div>
          ) : (
            visiveis.map((i) => <Linha key={i.id} item={i} aberto={aberto === i.id} onAbrir={() => setAberto(aberto === i.id ? null : i.id)} />)
          )}
        </div>
      </div>
    </div>
  );
}
