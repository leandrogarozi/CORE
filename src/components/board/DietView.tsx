"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { SendIcon, TrashIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import type { DietMeal } from "@/lib/types";
import type { UseBoard } from "@/lib/board/use-board";

function DietMealRow({ meal, board, whatsappOptIn }: { meal: DietMeal; board: UseBoard; whatsappOptIn: boolean }) {
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
        <ToggleSwitch
          checked={meal.active}
          onChange={(v) => board.updateDietMeal(meal.id, { active: v })}
          ariaLabel="Refeição ativa"
        />
        {whatsappOptIn && (
          <button
            type="button"
            className={"icon-btn diet-meal-whatsapp" + (meal.notifyWhatsapp ? " active" : "")}
            title={meal.notifyWhatsapp ? "Avisar essa refeição por WhatsApp — clique pra tirar" : "Avisar essa refeição por WhatsApp"}
            onClick={() => board.updateDietMeal(meal.id, { notifyWhatsapp: !meal.notifyWhatsapp })}
          >
            <SendIcon />
          </button>
        )}
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
    </div>
  );
}

export function DietView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [dietPlanInput, setDietPlanInput] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState("");
  const [newMealTime, setNewMealTime] = useState("");
  const [phoneInput, setPhoneInput] = useState<string | null>(null);

  const dietMeals = [...board.state.dietMeals].sort((a, b) => a.time.localeCompare(b.time));
  const whatsappOptIn = board.state.settings.dietWhatsappOptIn;

  function addMeal() {
    const name = newMealName.trim();
    if (!name || !newMealTime) return;
    board.addDietMeal(name, newMealTime);
    setNewMealName("");
    setNewMealTime("");
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
          <div className="diet-whatsapp-toggle-row">
            <span className="settings-label">Quer ser avisado no seu WhatsApp sobre sua dieta?</span>
            <ToggleSwitch
              checked={whatsappOptIn}
              onChange={(v) => board.updateSettings({ dietWhatsappOptIn: v })}
              ariaLabel="Avisos de dieta por WhatsApp"
            />
          </div>
          {whatsappOptIn && (
            <div className="diet-whatsapp-phone-row">
              <span className="settings-toggle-hint">Confirme o número (com DDD) que vai receber os avisos:</span>
              <input
                type="text"
                placeholder="ex.: 11 91234-5678"
                value={phoneInput ?? board.state.settings.notifyPhone ?? ""}
                onChange={(e) => setPhoneInput(e.target.value)}
                onBlur={() => {
                  if (phoneInput === null) return;
                  board.updateSettings({ notifyPhone: phoneInput.trim() || null });
                  setPhoneInput(null);
                }}
              />
              <span className="settings-toggle-hint">
                Depois, marque o ícone de WhatsApp em cada refeição que quiser avisar por lá.
              </span>
            </div>
          )}
        </div>

        <div className="diet-page-card">
          <span className="settings-label">Lembretes de refeição</span>
          <div className="diet-meals-list">
            {dietMeals.length === 0 && <div className="hp-empty">Nenhuma refeição configurada ainda.</div>}
            {dietMeals.map((m) => (
              <DietMealRow key={m.id} meal={m} board={board} whatsappOptIn={whatsappOptIn} />
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
