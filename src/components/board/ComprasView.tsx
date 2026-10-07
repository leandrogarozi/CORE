"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { MicButton } from "./MicButton";
import { TimePicker } from "./TimePicker";
import { NoteField } from "./NoteField";
import { BellIcon, CartIcon, ChevronIcon, SendIcon, TrashIcon, WhatsAppIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { compraPendente, textoDaLista } from "@/lib/board/compras";
import { fmtShortDate, todayISO } from "@/lib/date-utils";
import type { ShoppingItem } from "@/lib/types";

type Aba = "compra" | "desejo";

function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ItemCard({ item }: { item: ShoppingItem }) {
  const { board, askConfirm } = useBoardCtx();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(item.name);
  const [novoLink, setNovoLink] = useState("");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [nota, setNota] = useState(item.note);
  const hoje = todayISO();
  const pendente = item.kind === "desejo" || compraPendente(item, hoje);
  const temData = !!item.remindOn;

  function salvarNome() {
    const n = nome.trim();
    if (n && n !== item.name) board.updateShoppingItem(item.id, { name: n });
    else setNome(item.name);
  }

  function addLink() {
    const l = novoLink.trim();
    if (!l) return;
    const url = /^https?:\/\//i.test(l) ? l : `https://${l}`;
    board.updateShoppingItem(item.id, { links: [...item.links, { title: novoTitulo.trim(), url }] });
    setNovoLink("");
    setNovoTitulo("");
  }

  const resumo = [
    item.kind === "compra" && item.done && item.remindOn && !pendente ? `volta à lista em ${fmtShortDate(item.remindOn)}` : null,
    item.kind === "compra" && item.done && pendente ? "hora de comprar de novo" : null,
    temData && !(item.done && !pendente) ? `lembrar em ${fmtShortDate(item.remindOn as string)}` : null,
    item.links.length ? `${item.links.length} link${item.links.length > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={"shop-item" + (item.done && !pendente ? " done" : "")}>
      <div className="shop-item-head">
        {item.kind === "compra" ? (
          <input
            type="checkbox"
            className="shop-check"
            checked={item.done && !pendente}
            aria-label={`Comprei ${item.name}`}
            onChange={(e) => board.toggleShoppingBought(item.id, e.target.checked)}
          />
        ) : (
          <span className="shop-star" aria-hidden="true">
            ★
          </span>
        )}
        <input
          type="text"
          className="shop-name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvarNome}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        {resumo && <span className="shop-resumo">{resumo}</span>}
        <button
          type="button"
          className={"icon-btn" + (aberto ? " ativo" : "")}
          aria-expanded={aberto}
          title="Detalhes, lembrete e links"
          onClick={() => setAberto((v) => !v)}
        >
          <ChevronIcon />
        </button>
        <span className="shop-icones">
          <button
            type="button"
            className={"icon-btn bell-btn" + (item.inApp && temData ? " active" : "")}
            disabled={!temData}
            title={temData ? (item.inApp ? "Lembrete também dentro do app. Clique pra desligar." : "Lembrar também dentro do app") : "Escolha a data do lembrete (abra os detalhes)"}
            aria-label="Sininho: lembrete dentro do app"
            onClick={() => board.updateShoppingItem(item.id, { inApp: !item.inApp })}
          >
            <BellIcon filled={item.inApp && temData} />
          </button>
          <button
            type="button"
            className={"icon-btn zap-btn" + (item.whatsapp && temData ? " active" : "")}
            disabled={!temData}
            title={temData ? (item.whatsapp ? "Lembrete também no WhatsApp. Clique pra desligar." : "Lembrar também no WhatsApp") : "Escolha a data do lembrete (abra os detalhes)"}
            onClick={() => board.updateShoppingItem(item.id, { whatsapp: !item.whatsapp })}
          >
            <WhatsAppIcon filled={item.whatsapp && temData} />
          </button>
          <button
            type="button"
            className="icon-btn danger-hover"
            title="Excluir"
            onClick={() => askConfirm(`Excluir "${item.name}"?`, () => board.deleteShoppingItem(item.id))}
          >
            <TrashIcon />
          </button>
        </span>
      </div>

      {aberto && (
        <div className="shop-item-body">
          <div className="shop-linha">
            <span className="shop-rotulo">{item.kind === "desejo" ? "Lembrar de comparar em" : "Lembrar de comprar em"}</span>
            <input
              type="date"
              className="budget-input shop-data"
              value={item.remindOn ?? ""}
              onChange={(e) => board.updateShoppingItem(item.id, { remindOn: e.target.value || null })}
            />
            <TimePicker
              value={item.remindTime}
              onChange={(v) => board.updateShoppingItem(item.id, { remindTime: v || "09:00" })}
            />
            {temData && (
              <button type="button" className="btn btn-ghost" onClick={() => board.updateShoppingItem(item.id, { remindOn: null })}>
                Limpar
              </button>
            )}
          </div>

          {item.kind === "compra" && (
            <div className="shop-linha">
              <span className="shop-rotulo">Depois de comprar, relembrar em</span>
              <input
                type="number"
                min={0}
                placeholder="—"
                className="shop-dias"
                defaultValue={item.repeatDays ?? ""}
                aria-label="Dias para relembrar de comprar"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  board.updateShoppingItem(item.id, { repeatDays: Number.isFinite(v) && v > 0 ? Math.round(v) : null });
                }}
              />
              <span className="shop-rotulo">dias</span>
            </div>
          )}

          <div className="shop-campo">
            <span className="shop-rotulo">Anotações</span>
            <NoteField
              value={nota}
              placeholder={item.kind === "desejo" ? "Por que quero, o que comparar, preço visto..." : "Marca, quantidade, onde comprar..."}
              ariaLabel={`Anotações de ${item.name}`}
              onChange={setNota}
              onPersist={(html) => html !== item.note && board.updateShoppingItem(item.id, { note: html })}
            />
          </div>

          <div className="shop-campo">
            <span className="shop-rotulo">Links, cada um com um título (Compra, Vídeo do produto, Avaliação...)</span>
            {item.links.map((l, idx) => (
              <div className="shop-link" key={`${l.url}-${idx}`}>
                <input
                  type="text"
                  className="shop-link-titulo"
                  defaultValue={l.title}
                  placeholder="Título do link"
                  aria-label="Título do link"
                  onBlur={(e) => {
                    const t = e.target.value.trim();
                    if (t === l.title) return;
                    board.updateShoppingItem(item.id, {
                      links: item.links.map((x, k) => (k === idx ? { ...x, title: t } : x)),
                    });
                  }}
                />
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {hostDe(l.url)}
                </a>
                <button
                  type="button"
                  className="icon-btn danger-hover"
                  aria-label={`Remover o link ${l.title || hostDe(l.url)}`}
                  onClick={() => board.updateShoppingItem(item.id, { links: item.links.filter((_, k) => k !== idx) })}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="shop-link-novo">
              <div className="shop-link-sugestoes">
                {["Compra", "Vídeo do produto", "Avaliação"].map((t) => (
                  <button key={t} type="button" className="chip-btn" onClick={() => setNovoTitulo(t)}>
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="shop-novo-link"
                placeholder="Título do novo link (ex.: Compra)"
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
              />
              <input
                type="text"
                className="shop-novo-link"
                placeholder="Colar o link e apertar Enter"
                value={novoLink}
                onChange={(e) => setNovoLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
                onBlur={addLink}
              />
            </div>
          </div>

          {item.kind === "desejo" && (
            <div className="edit-actions" style={{ justifyContent: "flex-start" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => board.updateShoppingItem(item.id, { kind: "compra", done: false, doneOn: null })}
              >
                <CartIcon /> Passar pra lista de compras
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ComprasView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [aba, setAba] = useState<Aba>("compra");
  const [novo, setNovo] = useState("");
  const [verComprados, setVerComprados] = useState(false);
  const hoje = todayISO();

  const todos = board.state.shoppingItems;
  const daAba = todos.filter((i) => i.kind === aba);
  const pendentes = daAba.filter((i) => aba === "desejo" || compraPendente(i, hoje));
  const comprados = daAba.filter((i) => aba === "compra" && !compraPendente(i, hoje));
  const totalCompra = todos.filter((i) => i.kind === "compra" && compraPendente(i, hoje)).length;
  const totalDesejo = todos.filter((i) => i.kind === "desejo").length;

  async function adicionar() {
    const n = novo.trim();
    if (!n) return;
    setNovo("");
    const id = await board.addShoppingItem(aba, n);
    if (!id) setNovo(n);
  }

  function enviarWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(textoDaLista(todos, aba, hoje))}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Compras</span>
        <span style={{ width: 32 }} />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="view-toggle">
          <button type="button" className={"view-toggle-btn" + (aba === "compra" ? " active" : "")} onClick={() => setAba("compra")}>
            Lista de compras ({totalCompra})
          </button>
          <button type="button" className={"view-toggle-btn" + (aba === "desejo" ? " active" : "")} onClick={() => setAba("desejo")}>
            Lista de desejos ({totalDesejo})
          </button>
        </div>

        <div className="synapse-intro" style={{ marginTop: 12 }}>
          <p>
            {aba === "compra"
              ? "O que precisa comprar. Ao marcar “comprei”, o item sai da lista; se você escolher “relembrar em X dias”, ele volta sozinho na data certa."
              : "Produtos que você quer comprar ou comparar um dia: anotações e links de loja ou vídeo. Quando decidir, passe pra lista de compras."}
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
              placeholder={aba === "compra" ? "+ Adicionar à lista de compras e pressionar Enter" : "+ Adicionar à lista de desejos e pressionar Enter"}
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
              onBlur={adicionar}
            />
            <MicButton onText={(t) => setNovo((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o item" />
          </div>
        </div>

        {!pendentes.length && (
          <div className="list-card">
            <div className="hp-empty">{aba === "compra" ? "Nada pra comprar agora." : "Nenhum desejo anotado ainda."}</div>
          </div>
        )}

        <div className="shop-list">
          {pendentes.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
        </div>

        {pendentes.length > 0 && (
          <div className="edit-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={enviarWhatsApp}>
              <SendIcon /> Enviar a lista pro WhatsApp
            </button>
          </div>
        )}

        {aba === "compra" && comprados.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setVerComprados((v) => !v)}>
              {verComprados ? "Esconder" : "Ver"} comprados ({comprados.length})
            </button>
            {verComprados && (
              <div className="shop-list" style={{ marginTop: 8 }}>
                {comprados.map((i) => (
                  <ItemCard key={i.id} item={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
