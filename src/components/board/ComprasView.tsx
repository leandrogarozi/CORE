"use client";

import { useState } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { MicButton } from "./MicButton";
import { TimePicker } from "./TimePicker";
import { DateField } from "./DateField";
import { AvisoEscolha, canalDe, opcoesDoCanal, type CanalDeAviso } from "./AvisoEscolha";
import { NoteField } from "./NoteField";
import { BellIcon, CartIcon, ChevronIcon, HeartIcon, SendIcon, TrashIcon, WhatsAppIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { compraPendente, textoDaLista } from "@/lib/board/compras";
import { fmtShortDate, todayISO } from "@/lib/date-utils";
import type { ShoppingItem } from "@/lib/types";
import { TutorialLink } from "./TutorialLink";

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
  const [tituloPronto, setTituloPronto] = useState(false);
  const [sugestoes, setSugestoes] = useState(false);
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
    setTituloPronto(false);
    setSugestoes(false);
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
          <span className="shop-star ico-desejo" aria-hidden="true">
            <HeartIcon filled />
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
              <span className="shop-rotulo">Nome do link:</span>
              <input
                type="text"
                className="shop-novo-link"
                placeholder="Toque e escolha (vídeo, link de compra...) ou escreva"
                value={novoTitulo}
                onFocus={() => setSugestoes(true)}
                onChange={(e) => {
                  setNovoTitulo(e.target.value);
                  setTituloPronto(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novoTitulo.trim()) {
                    setTituloPronto(true);
                    setSugestoes(false);
                  }
                }}
                onBlur={() => {
                  if (novoTitulo.trim()) setTituloPronto(true);
                }}
              />
              {sugestoes && !tituloPronto && (
                <div className="shop-link-sugestoes">
                  {["Vídeo do produto", "Link de compra", "Avaliação", "Site do fabricante"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="chip-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setNovoTitulo(t);
                        setTituloPronto(true);
                        setSugestoes(false);
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {tituloPronto && novoTitulo.trim() && (
                <input
                  type="text"
                  className="shop-novo-link"
                  autoFocus
                  placeholder={`Colar o link de “${novoTitulo.trim()}” e apertar Enter`}
                  value={novoLink}
                  onChange={(e) => setNovoLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                  onBlur={addLink}
                />
              )}
            </div>
          </div>

          {item.kind === "desejo" && (
            <div className="edit-actions" style={{ justifyContent: "flex-start" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  const lista =
                    board.state.shoppingLists.find((l) => l.kind === "compra")?.id ??
                    (await board.addShoppingList("compra", "Lista de compras"));
                  board.updateShoppingItem(item.id, { kind: "compra", listId: lista, done: false, doneOn: null });
                }}
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

/** Produto de uma lista de compras: só marcar, o nome e o ×. Sem cartão, sem detalhes. */
function ItemLinha({ item }: { item: ShoppingItem }) {
  const { board } = useBoardCtx();
  const [nome, setNome] = useState(item.name);
  const pendente = compraPendente(item, todayISO());
  const comprado = item.done && !pendente;
  return (
    <div className={"shop-linha-simples" + (comprado ? " comprado" : "")}>
      <input
        type="checkbox"
        className="shop-check"
        checked={comprado}
        aria-label={`Comprei ${item.name}`}
        onChange={(e) => board.toggleShoppingBought(item.id, e.target.checked)}
      />
      <input
        type="text"
        className="shop-name"
        value={nome}
        aria-label="Nome do produto"
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => {
          const n = nome.trim();
          if (n && n !== item.name) board.updateShoppingItem(item.id, { name: n });
          else setNome(item.name);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <button type="button" className="icon-btn danger-hover" title="Tirar da lista" aria-label={`Tirar ${item.name} da lista`} onClick={() => board.deleteShoppingItem(item.id)}>
        <TrashIcon />
      </button>
    </div>
  );
}

function Listas({ aba, aberta, onAbrir }: { aba: Aba; aberta: string | null; onAbrir: (id: string | null) => void }) {
  const { board } = useBoardCtx();
  const [novaLista, setNovaLista] = useState("");
  const hoje = todayISO();
  const listas = board.state.shoppingLists.filter((l) => l.kind === aba);

  async function criar() {
    const n = novaLista.trim();
    if (!n) return;
    setNovaLista("");
    const id = await board.addShoppingList(aba, n);
    if (id) onAbrir(id);
    else setNovaLista(n);
  }

  return (
    <>
      <div className="synapse-intro" style={{ marginTop: 12 }}>
        <p>
          {aba === "compra"
            ? "Crie uma lista (Supermercado, Casa, Farmácia...), abra e cadastre os produtos pra montar a lista."
            : "Crie listas de desejo (Tecnologia, Casa, Presentes...) e, dentro de cada uma, os produtos que quer comprar ou comparar um dia, com anotações e links."}
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
            placeholder="Nome da nova lista e pressionar Enter"
            value={novaLista}
            onChange={(e) => setNovaLista(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            onBlur={criar}
          />
          <MicButton onText={(t) => setNovaLista((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o nome da lista" />
          <EnviarBtn onClick={() => criar()} label="Criar a lista" />
        </div>
      </div>
      {!listas.length && (
        <div className="list-card">
          <div className="hp-empty">Nenhuma lista ainda. Comece dando um nome pra primeira.</div>
        </div>
      )}
      <div className="shop-list">
        {listas.map((l) => {
          const itens = board.state.shoppingItems.filter((i) => i.listId === l.id);
          const pend = itens.filter((i) => aba === "desejo" || compraPendente(i, hoje)).length;
          const aberta1 = aberta === l.id;
          return (
            <div key={l.id} className={"shop-lista-cartao" + (aberta1 ? " aberta" : "")}>
              <button type="button" className="shop-lista-card" aria-expanded={aberta1} onClick={() => onAbrir(aberta1 ? null : l.id)}>
                <span className={"shop-lista-ico " + (aba === "compra" ? "ico-compra" : "ico-desejo")} aria-hidden="true">
                  {aba === "compra" ? <CartIcon /> : <HeartIcon filled />}
                </span>
                <span className="shop-lista-nome">{l.name}</span>
                <span className="shop-resumo">
                  {pend} {aba === "compra" ? (pend === 1 ? "item pra comprar" : "itens pra comprar") : pend === 1 ? "produto" : "produtos"}
                </span>
                <span className={"shop-lista-seta" + (aberta1 ? " aberta" : "")} aria-hidden="true">
                  ›
                </span>
              </button>
              {aberta1 && (
                <div className="shop-lista-corpo">
                  <ListaAberta listaId={l.id} onVoltar={() => onAbrir(null)} embutida />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ListaAberta({ listaId, onVoltar, embutida = false }: { listaId: string; onVoltar: () => void; embutida?: boolean }) {
  const { board, askConfirm } = useBoardCtx();
  const lista = board.state.shoppingLists.find((l) => l.id === listaId);
  const [novo, setNovo] = useState("");
  const [nome, setNome] = useState(lista?.name ?? "");
  const [verComprados, setVerComprados] = useState(false);
  const hoje = todayISO();
  // Lembrete da lista inteira ("quando ir às compras"): vive em Lembretes, o id fica na lista.
  const lembrete = lista?.reminderId ? board.state.reminders.find((r) => r.id === lista.reminderId && !r.deletedAt) ?? null : null;
  const [lemData, setLemData] = useState(lembrete?.date ?? hoje);
  const [lemHora, setLemHora] = useState(lembrete?.time ?? "09:00");
  const [lemCanal, setLemCanal] = useState<CanalDeAviso>(canalDe(lembrete));
  if (!lista) {
    return (
      <div className="list-card">
        <div className="hp-empty">Essa lista não existe mais.</div>
        <button type="button" className="btn btn-ghost" onClick={onVoltar}>
          Voltar às listas
        </button>
      </div>
    );
  }
  const aba = lista.kind;
  const itens = board.state.shoppingItems.filter((i) => i.listId === lista.id);
  const pendentes = itens.filter((i) => aba === "desejo" || compraPendente(i, hoje));
  const comprados = itens.filter((i) => aba === "compra" && !compraPendente(i, hoje));

  async function adicionar() {
    const n = novo.trim();
    if (!n) return;
    setNovo("");
    const id = await board.addShoppingItem(aba, n, lista!.id);
    if (!id) setNovo(n);
  }

  function salvarLembrete() {
    if (!lemData || !lemHora) return;
    const titulo = `Comprar: ${lista!.name}`;
    if (lembrete) {
      board.updateReminder(lembrete.id, { title: titulo, date: lemData, time: lemHora, alertMinutesBefore: 0, inApp: true, ...opcoesDoCanal(lemCanal), done: false });
    } else {
      const id = crypto.randomUUID();
      board.addReminder(titulo, lemData, lemHora, { id, alertMinutesBefore: 0, inApp: true, ...opcoesDoCanal(lemCanal) });
      board.setShoppingListReminder(lista!.id, id);
    }
  }

  function tirarLembrete() {
    if (lembrete) board.deleteReminder(lembrete.id);
    board.setShoppingListReminder(lista!.id, null);
  }

  function desmarcarTudo() {
    for (const i of comprados) board.toggleShoppingBought(i.id, false);
  }

  function enviarWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(textoDaLista(itens, aba, hoje, lista!.name))}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <>
      <div className="shop-lista-topo">
        {!embutida && (
          <button type="button" className="btn btn-ghost" onClick={onVoltar}>
            ‹ Listas
          </button>
        )}
        <span className={"shop-lista-ico " + (aba === "compra" ? "ico-compra" : "ico-desejo")} aria-hidden="true">
          {aba === "compra" ? <CartIcon /> : <HeartIcon filled />}
        </span>
        <input
          type="text"
          className="shop-lista-titulo"
          value={nome}
          aria-label="Nome da lista"
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => (nome.trim() ? board.renameShoppingList(lista.id, nome) : setNome(lista.name))}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <button
          type="button"
          className="icon-btn danger-hover"
          title="Excluir a lista"
          onClick={() =>
            askConfirm(`Excluir a lista "${lista.name}" e os ${itens.length} item(ns) dela?`, () => {
              if (lembrete) board.deleteReminder(lembrete.id);
              board.deleteShoppingList(lista.id);
              onVoltar();
            })
          }
        >
          <TrashIcon />
        </button>
      </div>

      {aba === "compra" && (
        <div className="shop-lembrete-barra">
          <span className="shop-rotulo">Lembrar de ir às compras</span>
          <DateField value={lemData} ariaLabel="Dia do lembrete da lista" onChange={setLemData} />
          <TimePicker value={lemHora} onChange={setLemHora} onClear={() => setLemHora("")} placeholder="hora" />
          <AvisoEscolha valor={lemCanal} onChange={setLemCanal} />
          <button type="button" className="btn btn-accent" disabled={!lemData || !lemHora} onClick={salvarLembrete}>
            {lembrete ? "Atualizar lembrete" : "Salvar lembrete"}
          </button>
          {lembrete && (
            <button type="button" className="link-acao perigo" onClick={tirarLembrete}>
              Tirar o lembrete
            </button>
          )}
          {lembrete?.date && (
            <span className="hint-text" style={{ margin: 0 }}>
              Lembrete marcado para {fmtShortDate(lembrete.date)} às {lembrete.time}.
            </span>
          )}
        </div>
      )}

      <div className="list-card" style={{ marginTop: 10 }}>
        <div className="quickadd-row">
          <span className="quickadd-plus" aria-hidden="true">
            +
          </span>
          <input
            type="text"
            className="quickadd-input"
            placeholder={aba === "compra" ? "Adicionar produto e pressionar Enter" : "Adicionar produto desejado e pressionar Enter"}
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            onBlur={adicionar}
          />
          <MicButton onText={(t) => setNovo((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o produto" />
          <EnviarBtn onClick={() => adicionar()} label="Adicionar o produto" />
        </div>
      </div>

      {!pendentes.length && (
        <div className="list-card">
          <div className="hp-empty">{aba === "compra" ? "Nada pra comprar nesta lista." : "Nenhum produto nesta lista ainda."}</div>
        </div>
      )}

      <div className="shop-list">
        {pendentes.map((i) => (aba === "compra" ? <ItemLinha key={i.id} item={i} /> : <ItemCard key={i.id} item={i} />))}
      </div>

      {(pendentes.length > 0 || (aba === "compra" && comprados.length > 0)) && (
        <div className="edit-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
          {pendentes.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={enviarWhatsApp}>
              <SendIcon /> Enviar a lista pro WhatsApp
            </button>
          )}
          {aba === "compra" && comprados.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={desmarcarTudo}>
              Desmarcar tudo (nova compra)
            </button>
          )}
        </div>
      )}

      {aba === "compra" && comprados.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setVerComprados((v) => !v)}>
            {verComprados ? "Esconder" : "Ver"} comprados ({comprados.length})
          </button>
          {verComprados && (
            <div className="shop-list" style={{ marginTop: 8 }}>
              {comprados.map((i) => (aba === "compra" ? <ItemLinha key={i.id} item={i} /> : <ItemCard key={i.id} item={i} />))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function ComprasView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [aba, setAba] = useState<Aba>("compra");
  const [aberta, setAberta] = useState<string | null>(null);
  const hoje = todayISO();

  const totalCompra = board.state.shoppingItems.filter((i) => i.kind === "compra" && compraPendente(i, hoje)).length;
  const totalDesejo = board.state.shoppingItems.filter((i) => i.kind === "desejo").length;

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Compras</span>
        <TutorialLink secao="compras" />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
          <div className="view-toggle">
            <button type="button" className={"view-toggle-btn" + (aba === "compra" ? " active" : "")} onClick={() => { setAba("compra"); setAberta(null); }}>
              <span className="ico-compra">
                <CartIcon />
              </span>{" "}
              Listas de compras ({totalCompra})
            </button>
            <button type="button" className={"view-toggle-btn" + (aba === "desejo" ? " active" : "")} onClick={() => { setAba("desejo"); setAberta(null); }}>
              <span className="ico-desejo">
                <HeartIcon filled />
              </span>{" "}
              Listas de desejos ({totalDesejo})
            </button>
          </div>
        <Listas aba={aba} aberta={aberta} onAbrir={setAberta} />
      </div>
    </div>
  );
}
