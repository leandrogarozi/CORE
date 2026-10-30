"use client";

import { useState } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { ToggleSwitch } from "./ToggleSwitch";
import { NoteField } from "./NoteField";
import { DateField } from "./DateField";
import { TimePicker } from "./TimePicker";
import { AvisoEscolha, canalDe, opcoesDoCanal, type CanalDeAviso } from "./AvisoEscolha";
import {
  BellIcon,
  CartIcon,
  ChecklistIcon,
  ChevronIcon,
  CheckIcon,
  DragGripIcon,
  DuplicateIcon,
  EditIcon,
  MoneyIcon,
  SendIcon,
  SuitcaseIcon,
  TrashIcon,
} from "./icons";
import { fmtAmount, fmtBRL, parseAmountToCents } from "@/lib/money";
import { fmtShortDate, todayISO } from "@/lib/date-utils";
import type { Checklist, ChecklistExpense, ChecklistItem } from "@/lib/types";
import type { UseBoard } from "@/lib/board/use-board";
import { listaReordenada } from "@/lib/board/reordenar";
import { TutorialLink } from "./TutorialLink";

function uid(): string {
  return crypto.randomUUID();
}

function totalCents(expenses: ChecklistExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

function expensesText(checklist: Checklist): string {
  const lines = [`\u{1F4B0} Gastos — ${checklist.title}`, ""];
  checklist.expenses.forEach((e) => {
    const quando = e.date ? ` (${fmtShortDate(e.date)})` : "";
    lines.push(`• ${e.label}${quando}: ${fmtBRL(e.amountCents)}`);
  });
  lines.push("", `Total: ${fmtBRL(totalCents(checklist.expenses))}`);
  if (checklist.budgetCents != null) lines.push(`Planejado: ${fmtBRL(checklist.budgetCents)}`);
  return lines.join("\n");
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

// Um gasto lançado. Descrição, valor e data ficam editáveis no lugar: errar o
// valor de um gasto é comum, e refazer o lançamento inteiro por causa de um
// centavo seria pior.
function ExpenseRow({
  expense,
  onChange,
  onDelete,
}: {
  expense: ChecklistExpense;
  onChange: (patch: Partial<ChecklistExpense>) => void;
  onDelete: () => void;
}) {
  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState<string | null>(null);

  function commitLabel() {
    if (labelDraft === null) return;
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== expense.label) onChange({ label: trimmed });
    setLabelDraft(null);
  }

  function commitAmount() {
    if (amountDraft === null) return;
    const cents = parseAmountToCents(amountDraft);
    if (cents !== null && cents !== expense.amountCents) onChange({ amountCents: cents });
    setAmountDraft(null);
  }

  return (
    <div className="checklist-expense-row">
      <input
        type="date"
        className="checklist-expense-date"
        value={expense.date ?? ""}
        aria-label="Data do gasto"
        onChange={(e) => onChange({ date: e.target.value || null })}
      />
      <input
        type="text"
        className="checklist-expense-label"
        value={labelDraft ?? expense.label}
        aria-label="No que gastou"
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <input
        type="text"
        inputMode="decimal"
        className="budget-input checklist-expense-amount mono"
        value={amountDraft ?? fmtAmount(expense.amountCents)}
        aria-label="Valor do gasto"
        onChange={(e) => setAmountDraft(e.target.value)}
        onBlur={commitAmount}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <button type="button" className="icon-btn danger-hover" title="Excluir gasto" onClick={onDelete}>
        <TrashIcon />
      </button>
    </div>
  );
}

// Valor de um item, no lugar: vazio = sem valor.
function ItemAmount({ item, onChange }: { item: ChecklistItem; onChange: (cents: number | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    if (draft === null) return;
    const cents = draft.trim() === "" ? null : parseAmountToCents(draft);
    if (cents !== undefined && (draft.trim() === "" || cents !== null) && cents !== (item.amountCents ?? null)) onChange(cents);
    setDraft(null);
  }
  return (
    <input
      type="text"
      inputMode="decimal"
      className="budget-input checklist-item-amount mono"
      placeholder="R$"
      aria-label={`Valor de ${item.text}`}
      value={draft ?? (item.amountCents != null ? fmtAmount(item.amountCents) : "")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

type ChecklistTab = "itens" | "gastos";

function ChecklistRow({
  checklist,
  board,
  posicao,
  arrastando,
  onDragStart,
  onDragOverCard,
  onDrop,
}: {
  checklist: Checklist;
  board: UseBoard;
  posicao: number;
  arrastando: boolean;
  onDragStart: (id: string) => void;
  onDragOverCard: (id: string) => void;
  onDrop: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChecklistTab>("itens");
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [typeDraft, setTypeDraft] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newExpenseLabel, setNewExpenseLabel] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseDate, setNewExpenseDate] = useState(() => todayISO());
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [notaDraft, setNotaDraft] = useState(checklist.notes);
  // Editar o nome de um item sem excluir e recriar.
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState("");
  // Carrinho do item: abre "quando lembrar de comprar" (data, hora, sininho e WhatsApp). O lembrete nasce em Lembretes.
  const [compraId, setCompraId] = useState<string | null>(null);
  const [compraData, setCompraData] = useState(() => todayISO());
  const [compraHora, setCompraHora] = useState("09:00");
  const [compraCanal, setCompraCanal] = useState<CanalDeAviso>("push");

  const total = checklist.items.length;
  const done = checklist.items.filter((i) => i.checked).length;

  function setItems(items: ChecklistItem[]) {
    board.updateChecklist(checklist.id, { items });
  }

  function toggleItem(itemId: string) {
    setItems(checklist.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
  }

  function lembreteDaCompra(item: ChecklistItem) {
    return item.buyReminderId ? board.state.reminders.find((r) => r.id === item.buyReminderId) ?? null : null;
  }

  function abrirCompra(item: ChecklistItem) {
    const r = lembreteDaCompra(item);
    setCompraData(r?.date ?? todayISO());
    setCompraHora(r?.time ?? "09:00");
    setCompraCanal(canalDe(r));
    setCompraId(item.id);
  }

  // O carrinho: marca "comprar" e já pergunta quando lembrar. Com o item já marcado, abre ou fecha a pergunta.
  function clickCarrinho(item: ChecklistItem) {
    if (!item.toBuy) {
      setItems(checklist.items.map((i) => (i.id === item.id ? { ...i, toBuy: true } : i)));
      abrirCompra(item);
      return;
    }
    if (compraId === item.id) setCompraId(null);
    else abrirCompra(item);
  }

  function salvarCompra(item: ChecklistItem) {
    if (!compraData || !compraHora) return;
    const titulo = `Comprar: ${item.text} (${checklist.title})`;
    const existente = lembreteDaCompra(item);
    if (existente) {
      board.updateReminder(existente.id, { title: titulo, date: compraData, time: compraHora, alertMinutesBefore: 0, inApp: true, ...opcoesDoCanal(compraCanal), done: false });
    } else {
      const id = uid();
      board.addReminder(titulo, compraData, compraHora, { id, alertMinutesBefore: 0, inApp: true, ...opcoesDoCanal(compraCanal) });
      setItems(checklist.items.map((i) => (i.id === item.id ? { ...i, toBuy: true, buyReminderId: id } : i)));
    }
    setCompraId(null);
  }

  function tirarLembreteDaCompra(item: ChecklistItem, desmarcar: boolean) {
    const r = lembreteDaCompra(item);
    if (r) board.deleteReminder(r.id);
    setItems(checklist.items.map((i) => (i.id === item.id ? { ...i, buyReminderId: null, toBuy: desmarcar ? false : i.toBuy } : i)));
    setCompraId(null);
  }

  function startEditItem(item: ChecklistItem) {
    setEditItemId(item.id);
    setEditItemText(item.text);
  }

  function commitEditItem() {
    if (editItemId === null) return;
    const text = editItemText.trim();
    const atual = checklist.items.find((i) => i.id === editItemId);
    // Nome vazio não vale: fica como estava.
    if (text && atual && text !== atual.text) {
      setItems(checklist.items.map((i) => (i.id === editItemId ? { ...i, text } : i)));
    }
    setEditItemId(null);
  }

  function deleteItem(itemId: string) {
    const item = checklist.items.find((i) => i.id === itemId);
    const r = item ? lembreteDaCompra(item) : null;
    if (r) board.deleteReminder(r.id);
    setItems(checklist.items.filter((i) => i.id !== itemId));
  }

  function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    setItems([...checklist.items, { id: uid(), text, checked: false, toBuy: false }]);
    setNewItemText("");
  }

  function setExpenses(expenses: ChecklistExpense[]) {
    board.updateChecklist(checklist.id, { expenses });
  }

  function addExpense() {
    const label = newExpenseLabel.trim();
    const cents = parseAmountToCents(newExpenseAmount);
    // Sem valor não é gasto; sem descrição fica "Gasto" pra não travar o
    // lançamento rápido no meio da viagem.
    if (cents === null || cents === 0) return;
    setExpenses([
      ...checklist.expenses,
      { id: uid(), label: label || "Gasto", amountCents: cents, date: newExpenseDate || null },
    ]);
    setNewExpenseLabel("");
    setNewExpenseAmount("");
  }

  function updateExpense(id: string, patch: Partial<ChecklistExpense>) {
    setExpenses(checklist.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function deleteExpense(id: string) {
    setExpenses(checklist.expenses.filter((e) => e.id !== id));
  }

  function commitBudget() {
    if (budgetDraft === null) return;
    // Campo apagado = sem valor planejado.
    const cents = budgetDraft.trim() === "" ? null : parseAmountToCents(budgetDraft);
    if (cents !== checklist.budgetCents) board.updateChecklist(checklist.id, { budgetCents: cents });
    setBudgetDraft(null);
  }

  function sendExpenses(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(expensesText(checklist))}`, "_blank", "noopener,noreferrer");
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

  // As linhas alternam entre branco e cinza bem clarinho: serve de referência pra
  // saber qual carrinho e qual lixeira pertencem a qual item.
  function renderItem(item: ChecklistItem, index: number) {
    const editando = editItemId === item.id;
    const lembrete = lembreteDaCompra(item);
    return (
      <div key={item.id}>
      <div className={"checklist-item-row" + (index % 2 === 1 ? " zebra" : "")}>
        <button
          type="button"
          className={"checklist-item-check" + (item.checked ? " checked" : "")}
          aria-label={item.checked ? "Desmarcar item" : "Marcar item"}
          onClick={() => toggleItem(item.id)}
        >
          {item.checked && <CheckIcon />}
        </button>
        {editando ? (
          <input
            type="text"
            className="checklist-item-edit"
            value={editItemText}
            autoFocus
            aria-label="Nome do item"
            onChange={(e) => setEditItemText(e.target.value)}
            onBlur={commitEditItem}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditItemId(null);
            }}
          />
        ) : (
          <span className={"checklist-item-text" + (item.checked ? " checked" : "")}>{item.text}</span>
        )}
        {lembrete?.date && !lembrete.deletedAt && (
          <span className="checklist-buy-quando" title="Lembrete de compra (em Lembretes)">
            <BellIcon /> {fmtShortDate(lembrete.date)}
            {lembrete.time ? ` ${lembrete.time}` : ""}
            {lembrete.whatsapp ? (lembrete.push === false ? " · zap" : " · push+zap") : ""}
          </span>
        )}
        {checklist.expensesEnabled && (
          <ItemAmount item={item} onChange={(cents) => setItems(checklist.items.map((i) => (i.id === item.id ? { ...i, amountCents: cents } : i)))} />
        )}
        <button
          type="button"
          className="icon-btn"
          title="Editar o nome do item"
          aria-label={`Editar ${item.text}`}
          // mouseDown e não click: o campo perde o foco antes do click e salvaria
          // e reabriria no mesmo gesto.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (editando ? commitEditItem() : startEditItem(item))}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className={"checklist-buy-toggle" + (item.toBuy ? " active" : "")}
          title={item.toBuy ? "Marcado para comprar. Toque para ver ou mudar o lembrete" : "Marcar para comprar e escolher quando lembrar"}
          onClick={() => clickCarrinho(item)}
        >
          <CartIcon />
        </button>
        <button type="button" className="icon-btn danger-hover" title="Excluir item" onClick={() => deleteItem(item.id)}>
          <TrashIcon />
        </button>
      </div>
      {compraId === item.id && (
        <div className="checklist-buy-painel">
          <span className="checklist-buy-titulo">Quando lembrar de comprar “{item.text}”?</span>
          <div className="checklist-buy-linha">
            <DateField value={compraData} ariaLabel="Dia do lembrete de compra" onChange={setCompraData} />
            <TimePicker value={compraHora} onChange={setCompraHora} onClear={() => setCompraHora("")} placeholder="hora" />
            <AvisoEscolha valor={compraCanal} onChange={setCompraCanal} />
          </div>
          <div className="checklist-buy-linha">
            <button type="button" className="btn btn-accent" disabled={!compraData || !compraHora} onClick={() => salvarCompra(item)}>
              Salvar lembrete
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCompraId(null)}>
              Só marcar, sem lembrete
            </button>
            {lembrete && (
              <button type="button" className="link-acao perigo" onClick={() => tirarLembreteDaCompra(item, false)}>
                Tirar o lembrete
              </button>
            )}
            <button type="button" className="link-acao" onClick={() => tirarLembreteDaCompra(item, true)}>
              Desmarcar compra
            </button>
          </div>
        </div>
      )}
      </div>
    );
  }

  const toBuyItems = checklist.items.filter((i) => i.toBuy);
  const packItems = checklist.items.filter((i) => !i.toBuy);
  // O gasto do checklist é o que foi lançado na aba Gastos mais o valor dos itens já marcados.
  const itensCents = checklist.items.reduce((sum, i) => sum + (i.checked ? (i.amountCents ?? 0) : 0), 0);
  const spentCents = totalCents(checklist.expenses) + itensCents;
  const leftCents = checklist.budgetCents != null ? checklist.budgetCents - spentCents : null;

  return (
    <div
      className={"checklist-card com-filete" + (arrastando ? " dragging" : "")}
      style={{ "--k": total > 0 && done === total ? "#2F9E44" : done > 0 ? "#C28A1E" : "#8A8A94" } as React.CSSProperties}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCard(checklist.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      {/* Só o punho é arrastável, não o cartão inteiro: o cabeçalho tem campos
          de texto (título e tipo), e cartão arrastável atrapalha selecionar
          texto dentro deles. O cartão continua sendo o alvo do soltar. */}
      <div className="checklist-topo">
      <span
        className="checklist-grip"
        title="Arraste pra reordenar — o próximo pode ficar no topo"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(checklist.id);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DragGripIcon />
        <span className="checklist-grip-num mono">{posicao}</span>
      </span>
      <button
        type="button"
        className={"checklist-head" + (open ? " has-body" : "")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={"chevron" + (open ? "" : " collapsed")}>
          <ChevronIcon />
        </span>
        <span className="tile-tipo" aria-hidden="true">
          {/viag|mala/i.test(checklist.type) ? <SuitcaseIcon /> : <ChecklistIcon />}
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
          {total > 0 ? `${done} de ${total}` : "vazio"}
        </span>
        {total > 0 && (
          <span className="checklist-bar" aria-hidden="true">
            <span className="checklist-bar-fill" style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </span>
        )}
        {checklist.expensesEnabled && (
          <span className="checklist-spent mono" title="Total gasto nesse checklist">
            gasto {fmtBRL(spentCents)}
          </span>
        )}
      </button>
      </div>
      {open && (
        <div className="checklist-body">
          <div className="checklist-notas">
            <NoteField
              value={notaDraft}
              placeholder="Reservas, endereços, o que lembrar, links..."
              ariaLabel={`Anotações de ${checklist.title}`}
              onChange={setNotaDraft}
              onPersist={(html) => html !== checklist.notes && board.updateChecklist(checklist.id, { notes: html })}
            />
          </div>
          <div className="checklist-tabs">
            <button
              type="button"
              className={"checklist-tab" + (tab === "itens" ? " active" : "")}
              onClick={() => setTab("itens")}
            >
              <ChecklistIcon /> Itens
              {total > 0 && <span className="checklist-tab-count mono">{`${done}/${total}`}</span>}
            </button>
            <button
              type="button"
              className={"checklist-tab" + (tab === "gastos" ? " active" : "")}
              onClick={() => setTab("gastos")}
            >
              <MoneyIcon /> Gastos
              {checklist.expensesEnabled && spentCents > 0 && (
                <span className="checklist-tab-count mono">{fmtBRL(spentCents)}</span>
              )}
            </button>
          </div>

          {tab === "gastos" ? (
            <div className="checklist-expenses">
              <label className="checklist-expenses-switch">
                <ToggleSwitch
                  checked={checklist.expensesEnabled}
                  ariaLabel="Registrar gastos nesse checklist"
                  onChange={(v) => board.updateChecklist(checklist.id, { expensesEnabled: v })}
                />
                <span>Registrar os gastos dessa viagem</span>
              </label>

              {!checklist.expensesEnabled ? (
                <div className="hint-text">
                  Ligue a chave pra anotar quanto gastou nessa viagem. Os gastos ficam guardados junto com o
                  checklist — e ao duplicar pra próxima viagem a lista de gastos começa zerada.
                </div>
              ) : (
                <>
                  <div className="checklist-expense-planned">
                    <span className="checklist-expense-planned-label">Planejado gastar</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="budget-input mono"
                      placeholder="opcional"
                      value={budgetDraft ?? (checklist.budgetCents != null ? fmtAmount(checklist.budgetCents) : "")}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                      onBlur={commitBudget}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    />
                  </div>

                  {checklist.expenses.length === 0 ? (
                    <div className="hp-empty">Nenhum gasto lançado ainda.</div>
                  ) : (
                    checklist.expenses.map((e) => (
                      <ExpenseRow
                        key={e.id}
                        expense={e}
                        onChange={(patch) => updateExpense(e.id, patch)}
                        onDelete={() => deleteExpense(e.id)}
                      />
                    ))
                  )}

                  <div className="checklist-expense-add">
                    <input
                      type="date"
                      className="checklist-expense-date"
                      aria-label="Data do novo gasto"
                      value={newExpenseDate}
                      onChange={(e) => setNewExpenseDate(e.target.value)}
                    />
                    <input
                      type="text"
                      className="checklist-expense-label"
                      placeholder="No que gastou (hotel, gasolina...)"
                      value={newExpenseLabel}
                      onChange={(e) => setNewExpenseLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addExpense()}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="budget-input checklist-expense-amount mono"
                      placeholder="0,00"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addExpense()}
                    />
                    <button type="button" className="btn btn-accent checklist-expense-add-btn" onClick={addExpense}>
                      Lançar
                    </button>
                  </div>

                  <div className="checklist-expense-total">
                    <span>Total gasto</span>
                    <strong className="mono">{fmtBRL(spentCents)}</strong>
                  </div>
                  {itensCents > 0 && (
                    <div className="hint-text">Inclui {fmtBRL(itensCents)} dos itens marcados na aba Itens.</div>
                  )}
                  {leftCents !== null && (
                    <div className={"checklist-expense-left" + (leftCents < 0 ? " over" : "")}>
                      {leftCents < 0
                        ? `Passou ${fmtBRL(-leftCents)} do planejado`
                        : `Ainda cabe ${fmtBRL(leftCents)} no planejado`}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {toBuyItems.length > 0 ? (
                <>
                  <div className="checklist-section-label">
                    <CartIcon /> Comprar
                  </div>
                  {toBuyItems.map((i, n) => renderItem(i, n))}
                  <div className="checklist-section-label">Levar</div>
                  {packItems.map((i, n) => renderItem(i, n))}
                </>
              ) : (
                checklist.items.map((i, n) => renderItem(i, n))
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
                <EnviarBtn onClick={() => addItem()} label="Adicionar o item" />
              </div>
            </>
          )}
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
            {checklist.expensesEnabled && checklist.expenses.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={sendExpenses}>
                <MoneyIcon /> Enviar os gastos
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
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [sobreId, setSobreId] = useState<string | null>(null);

  // Pela ordem MANUAL, não pela data. Antes era o mais recente primeiro — com
  // isso, arrastar não teria efeito nenhum na tela. O desempate por título
  // mantém a lista estável se duas ordens empatarem por algum motivo.
  const checklists = [...board.state.checklists].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title)
  );
  const existingTypes = Array.from(new Set(board.state.checklists.map((c) => c.type))).sort();

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addChecklist(title, newType);
    setNewTitle("");
    setNewType("");
  }

  function soltar() {
    const ids = checklists.map((c) => c.id);
    const novos = listaReordenada(ids, arrastandoId, sobreId);
    // Só grava se mudou de lugar: soltar no mesmo ponto não vale uma escrita no
    // banco por checklist.
    if (novos !== ids) board.reorderChecklists(novos);
    setArrastandoId(null);
    setSobreId(null);
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Checklists</span>
        <TutorialLink secao="checklists" />
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
            <EnviarBtn onClick={() => handleAdd()} label="Criar o checklist" />
          </div>
        </div>

        <div className="list-card">
          {checklists.length === 0 ? (
            <div className="hp-empty">Nenhum checklist ainda.</div>
          ) : (
            checklists.map((c, i) => (
              <ChecklistRow
                key={c.id}
                checklist={c}
                board={board}
                posicao={i + 1}
                arrastando={arrastandoId === c.id}
                onDragStart={setArrastandoId}
                onDragOverCard={setSobreId}
                onDrop={soltar}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
