"use client";

import { useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";

/** Marca no `featureFlags` (já existe e já é gravado) que a pessoa passou ou pulou as boas-vindas. */
export const FLAG_BOAS_VINDAS = "onboarding_done";

const FUSOS_DO_BRASIL = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Campo_Grande",
  "America/Cuiaba",
  "America/Boa_Vista",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Maceio",
  "America/Araguaina",
  "America/Santarem",
  "America/Noronha",
];

/**
 * Primeiro acesso: três passos curtos (nome e fuso, WhatsApp opcional, instalar o app e ligar avisos).
 * Só aparece para conta nova: sem nome no Perfil e sem a marca de "já passei por aqui".
 * Quem já usa o FARO (nome preenchido) nunca vê. Pular também conta como feito.
 */
export function WelcomeModal({ onAbrirConfiguracoes }: { onAbrirConfiguracoes: () => void }) {
  const { board } = useBoardCtx();
  const s = board.state.settings;
  const [passo, setPasso] = useState(0);
  const detectado = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    } catch {
      return "America/Sao_Paulo";
    }
  }, []);
  const [nome, setNome] = useState("");
  const [fuso, setFuso] = useState(detectado);
  const [telefone, setTelefone] = useState("");

  const mostrar = !board.loading && !s.preferredName?.trim() && s.featureFlags[FLAG_BOAS_VINDAS] !== true;
  if (!mostrar) return null;

  const fusos = FUSOS_DO_BRASIL.includes(fuso) ? FUSOS_DO_BRASIL : [fuso, ...FUSOS_DO_BRASIL];

  function concluir(irParaConfiguracoes = false) {
    board.updateSettings({
      preferredName: nome.trim() || s.preferredName,
      timezone: fuso || s.timezone,
      notifyPhone: telefone.trim() || s.notifyPhone,
      featureFlags: { ...s.featureFlags, [FLAG_BOAS_VINDAS]: true },
    });
    if (irParaConfiguracoes) onAbrirConfiguracoes();
  }

  return (
    <>
      <div className="modal-backdrop" />
      <div className="modal-panel welcome-panel" role="dialog" aria-modal="true" aria-label="Boas-vindas ao FARO">
        <div className="welcome-passos">Passo {passo + 1} de 3</div>

        {passo === 0 && (
          <>
            <div className="modal-title">Bem-vindo(a) ao FARO</div>
            <p className="welcome-texto">Duas coisas rápidas para o app ficar do seu jeito.</p>
            <label className="welcome-campo">
              <span>Como você quer ser chamado(a)?</span>
              <input
                type="text"
                autoFocus
                className="budget-input"
                placeholder="Seu nome ou apelido"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
            <label className="welcome-campo">
              <span>Seu fuso horário</span>
              <select className="budget-input" value={fuso} onChange={(e) => setFuso(e.target.value)}>
                {fusos.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace("America/", "").replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <small>É o que faz o lembrete tocar na hora certa para você.</small>
            </label>
          </>
        )}

        {passo === 1 && (
          <>
            <div className="modal-title">Lembretes no WhatsApp (opcional)</div>
            <p className="welcome-texto">
              Se quiser receber lembretes no WhatsApp, coloque seu número. O FARO só manda mensagem das coisas em que <b>você</b> ligar o
              ícone do zap, e você desliga quando quiser. Cada mensagem tem um custo pequeno, que aparece no app e tem teto.
            </p>
            <label className="welcome-campo">
              <span>WhatsApp com DDD</span>
              <input
                type="tel"
                className="budget-input"
                placeholder="+55 11 91234-5678"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
              <small>Pode deixar em branco e pular. Dá para colocar depois em Perfil.</small>
            </label>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="modal-title">Instale o app e ligue os avisos</div>
            <ul className="welcome-lista">
              <li>
                <b>iPhone:</b> abra o FARO no Safari, toque em Compartilhar e em &quot;Adicionar à Tela de Início&quot;. Abra pelo ícone novo.
              </li>
              <li>
                <b>Android:</b> no Chrome, menu (três pontinhos) e &quot;Instalar app&quot; ou &quot;Adicionar à tela inicial&quot;.
              </li>
              <li>
                <b>Depois:</b> em Configurações, grupo Avisos, toque em &quot;Ativar notificações&quot; para o celular te avisar dos lembretes.
              </li>
            </ul>
            <p className="welcome-texto">No computador não precisa instalar nada: os avisos funcionam com o FARO aberto no navegador.</p>
          </>
        )}

        <div className="edit-actions edit-actions-split">
          {passo === 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => concluir()}>
              Pular tudo
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setPasso(passo - 1)}>
              Voltar
            </button>
          )}
          {passo < 2 ? (
            <button type="button" className="btn btn-accent" onClick={() => setPasso(passo + 1)}>
              {passo === 1 && !telefone.trim() ? "Pular" : "Continuar"}
            </button>
          ) : (
            <span className="welcome-fim">
              <button type="button" className="btn btn-ghost" onClick={() => concluir(true)}>
                Abrir Configurações
              </button>
              <button type="button" className="btn btn-accent" onClick={() => concluir()}>
                Começar a usar
              </button>
            </span>
          )}
        </div>
      </div>
    </>
  );
}
