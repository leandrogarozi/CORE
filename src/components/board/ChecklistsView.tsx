"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { ToggleSwitch } from "./ToggleSwitch";
import { CartIcon, ChecklistIcon, ChevronIcon, CheckIcon, DuplicateIcon, MoneyIcon, SendIcon, TrashIcon } from "./icons";
import { fmtAmount, fmtBRL, parseAmountToCents } from "@/lib/money";
import { fmtShortDate, todayISO } from "@/lib/date-utils";
import type { Checklist, ChecklistExpense, ChecklistItem } from "@/lib/types";
import type { UseBoard } from "@/lib/board/use-board";

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

type ChecklistTab = "itens" | "gastos";

function ChecklistRow({ checklist, board }: { checklist: Checklist; board: UseBoard }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChecklistTab>("itens");
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [typeDraft, setTypeDraft] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newExpenseLabel, setNewExpenseLabel] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseDate, setNewExpenseDate] = useState(() => todayISO());
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);

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
          className={"checklist-buy-toggle" + (item.toBuy ? " active" : "")}
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
  const spentCents = totalCents(checklist.expenses);
  const leftCents = checklist.budgetCents != null ? checklist.budgetCents - spentCents : null;

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
        {checklist.expensesEnabled && (
          <span className="checklist-spent mono" title="Total gasto nesse checklist">
            {fmtBRL(spentCents)}
          </span>
        )}
      </button>
      {open && (
        <div className="checklist-body">
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
