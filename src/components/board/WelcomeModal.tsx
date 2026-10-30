"use client";

import { useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";
import { ArchiveIcon, BellIcon, BookOpenIcon, CommentIcon, HomeIcon } from "./icons";

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
  // Antes dos três passos: quem está entrando agora precisa saber que é um teste inicial.
  const [intro, setIntro] = useState(true);
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
  const [aceitaZap, setAceitaZap] = useState(false);

  const mostrar = !board.loading && !s.preferredName?.trim() && s.featureFlags[FLAG_BOAS_VINDAS] !== true && s.featureFlags.modo_dono !== true;
  if (!mostrar) return null;

  const fusos = FUSOS_DO_BRASIL.includes(fuso) ? FUSOS_DO_BRASIL : [fuso, ...FUSOS_DO_BRASIL];

  function concluir(irParaConfiguracoes = false) {
    board.updateSettings({
      preferredName: nome.trim() || s.preferredName,
      timezone: fuso || s.timezone,
      notifyPhone: telefone.trim() || s.notifyPhone,
      featureFlags: { ...s.featureFlags, [FLAG_BOAS_VINDAS]: true, ...(telefone.trim() && aceitaZap ? { whatsapp_aceite: true } : {}) },
    });
    if (irParaConfiguracoes) onAbrirConfiguracoes();
  }

  if (intro) {
    return (
      <>
        <div className="modal-backdrop" />
        <div className="modal-panel welcome-panel" role="dialog" aria-modal="true" aria-label="Boas-vindas ao FARO">
          <div className="welcome-cab">
            <div className="modal-title">Bem-vindo(a) ao FARO</div>
            <p className="welcome-texto">
              Seu painel de <strong>Foco, Ação, Rotina e Objetivos</strong>: tarefas, lembretes, reuniões e tudo o que você aprende ficam num só lugar, como um cérebro digital que vai te conhecendo.
            </p>
          </div>
          <div className="welcome-aviso">
            Você está entre as <strong>pessoas do teste inicial</strong>. O app ainda está sendo construído: pode haver erros, e algumas coisas vão mudar. O que você usar e disser mostra onde melhorar.
          </div>
          <div className="welcome-linhas">
            <div className="welcome-linha">
              <span className="welcome-icone"><CommentIcon /></span>
              <div>
                <b>Achou um erro ou teve uma ideia?</b>
                <span>Conte no <strong>Canal de feedback</strong>, no menu.</span>
              </div>
            </div>
            <div className="welcome-linha">
              <span className="welcome-icone"><BookOpenIcon /></span>
              <div>
                <b>Ficou em dúvida?</b>
                <span>Abra o <strong>Como usar</strong>, no menu, ou o botão “Como funciona” de cada tela.</span>
              </div>
            </div>
            <div className="welcome-linha">
              <span className="welcome-icone"><ArchiveIcon /></span>
              <div>
                <b>Guarde o que você escreve</b>
                <span>Faça os seus <strong>backups</strong> de vez em quando, em Configurações.</span>
              </div>
            </div>
          </div>
          <div className="welcome-fim">
            <button type="button" className="btn btn-accent" onClick={() => setIntro(false)}>
              Entendi, vamos começar
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-backdrop" />
      <div className="modal-panel welcome-panel" role="dialog" aria-modal="true" aria-label="Boas-vindas ao FARO">
        <div className="welcome-progresso" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={passo + 1} aria-label={`Passo ${passo + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= passo ? "feito" : ""} />
          ))}
        </div>

        {passo === 0 && (
          <>
            <div className="welcome-cab">
              <div className="modal-title">Vamos deixar o app do seu jeito</div>
              <p className="welcome-texto">Duas coisas rápidas.</p>
            </div>
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
            <div className="welcome-cab">
              <div className="modal-title">Lembretes no WhatsApp (opcional)</div>
              <p className="welcome-texto">
                O FARO só manda mensagem das coisas em que <b>você</b> ligar o ícone do zap, e você desliga quando quiser. Cada mensagem tem um custo pequeno, que aparece no app e tem teto.
              </p>
            </div>
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
            <label className="welcome-aceite">
              <input type="checkbox" checked={aceitaZap} onChange={(e) => setAceitaZap(e.target.checked)} />
              <span>
                Aceito receber lembretes por WhatsApp neste número. Cada mensagem usa um crédito que o FARO te dá; sem crédito, o lembrete segue chegando por notificação.
              </span>
            </label>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="welcome-cab">
              <div className="modal-title">Instale o app e ligue os avisos</div>
              <p className="welcome-texto">Instalado, o FARO abre com ícone próprio e os avisos chegam com mais segurança. Também dá para usar direto no navegador.</p>
            </div>
            <div className="welcome-linhas">
              <div className="welcome-linha">
                <span className="welcome-icone"><HomeIcon /></span>
                <div>
                  <b>iPhone</b>
                  <span>Abra no Safari, toque em Compartilhar e em “Adicionar à Tela de Início”.</span>
                </div>
              </div>
              <div className="welcome-linha">
                <span className="welcome-icone"><HomeIcon /></span>
                <div>
                  <b>Android</b>
                  <span>No Chrome, menu (três pontinhos) e “Instalar app”.</span>
                </div>
              </div>
              <div className="welcome-linha">
                <span className="welcome-icone"><HomeIcon /></span>
                <div>
                  <b>Computador</b>
                  <span>No Chrome ou Edge, clique no ícone de instalar no fim da barra de endereço. No Mac com Safari: Arquivo e “Adicionar ao Dock”.</span>
                </div>
              </div>
              <div className="welcome-linha">
                <span className="welcome-icone"><BellIcon /></span>
                <div>
                  <b>Depois, ligue os avisos</b>
                  <span>Em Configurações, grupo “Assistente e avisos”, toque em “Ativar notificações”.</span>
                </div>
              </div>
            </div>
            <div className="welcome-aviso">
              <strong>Seus dados:</strong> o FARO guarda uma cópia diária da sua conta por 14 dias. Mesmo assim, de vez em quando baixe a sua em Configurações, grupo “Dados e backup”. O passo a passo completo está no <b>Como usar</b>.
            </div>
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
