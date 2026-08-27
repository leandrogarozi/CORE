"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { CartIcon, ChevronIcon, CheckIcon, DuplicateIcon, SendIcon, TrashIcon } from "./icons";
import type { Checklist, ChecklistItem } from "@/lib/types";
import type { UseBoard } from "@/lib/board/use-board";

function uid(): string {
  return crypto.randomUUID();
}

function shareText(checklist: Checklist): string {
  const lines = [`📋 ${checklist.title} (${checklist.type})`, ""];
  checklist.items.forEach((i) => lines.push(`${i.toBuy ? "🛒" : i.checked ? "✅" : "⬜"} ${i.text}`));
  return lines.join("\n");
}

function shoppingListText(checklist: Checklist, toBuyItems: ChecklistItem[]): string {
  const lines = [`🛒 Lista de compras — ${checklist.title}`, ""];
  toBuyItems.forEach((i) => lines.push(`${i.checked ? "✅" : "⬜"} ${i.text}`));
  return lines.join("\n");
}

function ChecklistRow({ checklist, board }: { checklist: Checklist; board: UseBoard }) {
  const [open, setOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [typeDraft, setTypeDraft] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  const total = checklist.items.length;
  const done = checklist.items.filter((i) => i.checked).length;

  function setItems(items: ChecklistItem[]) {
    board.updateChecklist(checklist.id, { items });
  }

  function toggleItem(itemId: string) {
    setItems(checklist.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
  }

  function toggleBuy(itemId: string) {
    setItems(checklist.items.map((i) => (i.id === itemId ? { ...i, toBuy: !i.toBuy } : i)));
  }

  function deleteItem(itemId: string) {
    setItems(checklist.items.filter((i) => i.id !== itemId));
  }

  function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    setItems([...checklist.items, { id: uid(), text, checked: false, toBuy: false }]);
    setNewItemText("");
  }

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== checklist.title) board.updateChecklist(checklist.id, { title: trimmed });
    setTitleDraft(null);
  }

  function commitType() {
    if (typeDraft === null) return;
    const trimmed = typeDraft.trim();
    if (trimmed && trimmed !== checklist.type) board.updateChecklist(checklist.id, { type: trimmed });
    setTypeDraft(null);
  }

  function sendWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText(checklist))}`, "_blank", "noopener,noreferrer");
  }

  function sendShoppingList(e: React.MouseEvent) {
    e.stopPropagation();
    const toBuyItems = checklist.items.filter((i) => i.toBuy);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shoppingListText(checklist, toBuyItems))}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function renderItem(item: ChecklistItem) {
    return (
      <div className="checklist-item-row" key={item.id}>
        <button
          type="button"
          className={"checklist-item-check" + (item.checked ? " checked" : "")}
          aria-label={item.checked ? "Desmarcar item" : "Marcar item"}
          onClick={() => toggleItem(item.id)}
        >
          {item.checked && <CheckIcon />}
        </button>
        <span className={"checklist-item-text" + (item.checked ? " checked" : "")}>{item.text}</span>
        <button
          type="button"
          className={"icon-btn" + (item.toBuy ? " active" : "")}
          title={item.toBuy ? "Marcado para comprar" : "Marcar para comprar"}
          onClick={() => toggleBuy(item.id)}
        >
          <CartIcon />
        </button>
        <button type="button" className="icon-btn danger-hover" title="Excluir item" onClick={() => deleteItem(item.id)}>
          <TrashIcon />
        </button>
      </div>
    );
  }

  const toBuyItems = checklist.items.filter((i) => i.toBuy);
  const packItems = checklist.items.filter((i) => !i.toBuy);

  return (
    <div className="checklist-card">
      <button
        type="button"
        className={"checklist-head" + (open ? " has-body" : "")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={"chevron" + (open ? "" : " collapsed")}>
          <ChevronIcon />
        </span>
        <input
          type="text"
          className="checklist-title-input"
          value={titleDraft ?? checklist.title}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <input
          type="text"
          className="chip checklist-type-chip"
          value={typeDraft ?? checklist.type}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setTypeDraft(e.target.value)}
          onBlur={commitType}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="checklist-progress">
          {total > 0 ? `${done}/${total}` : "vazio"}
        </span>
      </button>
      {open && (
        <div className="checklist-body">
          {toBuyItems.length > 0 ? (
            <>
              <div className="checklist-section-label">🛒 Comprar</div>
              {toBuyItems.map(renderItem)}
              <div className="checklist-section-label">Levar</div>
              {packItems.map(renderItem)}
            </>
          ) : (
            checklist.items.map(renderItem)
          )}
          <div className="quickadd-row checklist-quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="Novo item e pressionar Enter"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
          </div>
          <div className="checklist-actions">
            <button type="button" className="btn btn-ghost" onClick={() => board.duplicateChecklist(checklist.id)}>
              <DuplicateIcon /> Duplicar
            </button>
            <button type="button" className="btn btn-ghost" onClick={sendWhatsApp}>
              <SendIcon /> Enviar pro WhatsApp
            </button>
            {toBuyItems.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={sendShoppingList}>
                <CartIcon /> Enviar lista de compras
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost danger-hover"
              onClick={() => board.deleteChecklist(checklist.id)}
            >
              <TrashIcon /> Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChecklistsView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("");

  const checklists = [...board.state.checklists].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const existingTypes = Array.from(new Set(board.state.checklists.map((c) => c.type))).sort();

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addChecklist(title, newType);
    setNewTitle("");
    setNewType("");
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Checklists</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="hint-text" style={{ marginBottom: 12 }}>
        Listas reutilizáveis por tipo (viagem, trabalho...). Duplique um checklist antigo pra aproveitar pro
        próximo, ou mande a lista pro WhatsApp pra conferir.
      </div>

      <div className="narrow-list">
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="Novo checklist (ex.: Viagem praia)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <input
              type="text"
              className="budget-input checklist-type-input"
              placeholder="tipo (viagem...)"
              list="checklist-types"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <datalist id="checklist-types">
              {existingTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="list-card">
          {checklists.length === 0 ? (
            <div className="hp-empty">Nenhum checklist ainda.</div>
          ) : (
            checklists.map((c) => <ChecklistRow key={c.id} checklist={c} board={board} />)
          )}
        </div>
      </div>
    </div>
  );
}
