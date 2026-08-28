"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { BellIcon, TrashIcon, WhatsAppIcon } from "./icons";
import { DAY_NAMES } from "@/lib/date-utils";
import type { DietMeal } from "@/lib/types";
import type { UseBoard } from "@/lib/board/use-board";

function DietMealRow({
  meal,
  board,
  appOptIn,
  whatsappOptIn,
}: {
  meal: DietMeal;
  board: UseBoard;
  appOptIn: boolean;
  whatsappOptIn: boolean;
}) {
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState<string | null>(null);

  function commitName() {
    if (nameDraft === null) return;
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== meal.name) board.updateDietMeal(meal.id, { name: trimmed });
    setNameDraft(null);
  }

  function commitMessage() {
    if (messageDraft === null) return;
    if (messageDraft !== meal.message) board.updateDietMeal(meal.id, { message: messageDraft });
    setMessageDraft(null);
  }

  function toggleWeekDay(d: number) {
    const cur = meal.weekDays ?? [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
    board.updateDietMeal(meal.id, { weekDays: next.length > 0 && next.length < 7 ? next : null });
  }

  return (
    <div className={"diet-meal-card" + (meal.active ? "" : " inactive")}>
      <div className="diet-meal-head">
        <input
          type="text"
          className="diet-meal-name"
          value={nameDraft ?? meal.name}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <input
          type="time"
          value={meal.time}
          onChange={(e) => board.updateDietMeal(meal.id, { time: e.target.value })}
        />
        <button
          type="button"
          className={"icon-btn diet-meal-app-toggle" + (meal.active ? " active" : "")}
          disabled={!appOptIn}
          title={
            !appOptIn
              ? "Ative lembretes dentro do app ali em cima primeiro"
              : meal.active
                ? "Lembrete no app ativo — clique pra desativar"
                : "Lembrete no app desativado — clique pra ativar"
          }
          onClick={() => appOptIn && board.updateDietMeal(meal.id, { active: !meal.active })}
        >
          <BellIcon filled={meal.active} />
        </button>
        <button
          type="button"
          className={"icon-btn diet-meal-whatsapp" + (meal.notifyWhatsapp ? " active" : "")}
          disabled={!whatsappOptIn}
          title={
            !whatsappOptIn
              ? "Ative avisos por WhatsApp ali em cima primeiro"
              : meal.notifyWhatsapp
                ? "Lembrete por WhatsApp ativo — clique pra desativar"
                : "Lembrete por WhatsApp desativado — clique pra ativar"
          }
          onClick={() => whatsappOptIn && board.updateDietMeal(meal.id, { notifyWhatsapp: !meal.notifyWhatsapp })}
        >
          <WhatsAppIcon filled={meal.notifyWhatsapp} />
        </button>
        <button
          type="button"
          className="icon-btn danger-hover"
          aria-label="Excluir refeição"
          onClick={() => board.deleteDietMeal(meal.id)}
        >
          <TrashIcon />
        </button>
      </div>
      <textarea
        className="diet-meal-message"
        placeholder="Escreva aqui como quer receber o texto do seu lembrete — pode ser só o título, as calorias, a divisão da dieta ou a refeição descrita para esse horário."
        value={messageDraft ?? meal.message}
        onChange={(e) => setMessageDraft(e.target.value)}
        onBlur={commitMessage}
        rows={2}
      />
      <div className="edit-field">
        <span className="edit-field-label">Lembrar nesses dias</span>
        <div className="weekday-picker">
          <button
            type="button"
            className={"weekday-all-btn" + (!meal.weekDays || meal.weekDays.length === 0 ? " active" : "")}
            onClick={() => board.updateDietMeal(meal.id, { weekDays: null })}
          >
            Todos
          </button>
          {DAY_NAMES.map((label, d) => (
            <button
              key={d}
              type="button"
              className={"weekday-btn" + ((meal.weekDays ?? []).includes(d) ? " active" : "")}
              title={label}
              onClick={() => toggleWeekDay(d)}
            >
              {label[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DietView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [dietPlanInput, setDietPlanInput] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState("");
  const [newMealTime, setNewMealTime] = useState("");
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const dietMeals = [...board.state.dietMeals].sort((a, b) => a.time.localeCompare(b.time));
  const appOptIn = board.state.settings.dietAppOptIn;
  const whatsappOptIn = board.state.settings.dietWhatsappOptIn;

  function addMeal() {
    const name = newMealName.trim();
    if (!name || !newMealTime) return;
    board.addDietMeal(name, newMealTime);
    setNewMealName("");
    setNewMealTime("");
  }

  function confirmPhone() {
    const value = (phoneInput ?? board.state.settings.notifyPhone ?? "").trim();
    board.updateSettings({ notifyPhone: value || null });
    setPhoneInput(null);
    setPhoneSaved(true);
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Dieta</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list">
        <div className="diet-page-card">
          <span className="settings-label">Meu plano (receitas, macros, o que quiser guardar)</span>
          <textarea
            className="diet-plan-input"
            placeholder="Cole ou escreva aqui o plano/dieta que está seguindo..."
            value={dietPlanInput ?? board.state.settings.dietPlan ?? ""}
            onChange={(e) => setDietPlanInput(e.target.value)}
            onBlur={() => {
              if (dietPlanInput === null) return;
              board.updateSettings({ dietPlan: dietPlanInput || null });
              setDietPlanInput(null);
            }}
            rows={6}
          />
        </div>

        <div className="diet-page-card">
          <span className="settings-label">Onde quer ser lembrado?</span>
          <div className="diet-channel-options">
            <label className="diet-channel-option">
              <input
                type="checkbox"
                checked={appOptIn}
                onChange={(e) => board.updateSettings({ dietAppOptIn: e.target.checked })}
              />
              <BellIcon /> Notificação dentro do app
            </label>
            <label className="diet-channel-option">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => board.updateSettings({ dietWhatsappOptIn: e.target.checked })}
              />
              <WhatsAppIcon /> Notificação via WhatsApp
            </label>
          </div>
          {whatsappOptIn && (
            <div className="diet-whatsapp-phone-row">
              <span className="settings-toggle-hint">Confirme o número (com DDD) que vai receber os avisos:</span>
              <div className="diet-phone-confirm-row">
                <input
                  type="text"
                  placeholder="ex.: 11 91234-5678"
                  value={phoneInput ?? board.state.settings.notifyPhone ?? ""}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setPhoneSaved(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && confirmPhone()}
                />
                <button type="button" className="btn btn-ghost" onClick={confirmPhone}>
                  Confirmar
                </button>
              </div>
              {phoneSaved && <span className="diet-phone-saved">✓ Número salvo</span>}
            </div>
          )}
        </div>

        <div className="diet-page-card">
          <span className="settings-label">Lembretes de refeição</span>
          <div className="diet-meals-list">
            {dietMeals.length === 0 && <div className="hp-empty">Nenhuma refeição configurada ainda.</div>}
            {dietMeals.map((m) => (
              <DietMealRow key={m.id} meal={m} board={board} appOptIn={appOptIn} whatsappOptIn={whatsappOptIn} />
            ))}
          </div>
          <div className="diet-meal-add">
            <input
              type="text"
              placeholder="+ nome da refeição (ex.: Café da manhã)"
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMeal()}
            />
            <input type="time" value={newMealTime} onChange={(e) => setNewMealTime(e.target.value)} />
            <button type="button" className="btn btn-ghost" onClick={addMeal}>
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
