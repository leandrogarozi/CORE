"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { BoltIcon, BookOpenIcon, HomeIcon, MenuIcon } from "./icons";
import type { ViewMode } from "./Sidebar";

/**
 * Menu inferior do celular: cinco atalhos ao alcance do polegar (Hoje, Semana, Criar, Aprender, Menu).
 * "Criar" e "Aprender" abrem uma folha curta com as opções; "Menu" abre a gaveta de sempre.
 * Só aparece em tela pequena (CSS); no computador o menu continua na lateral.
 */
const MODOS_DE_APRENDER: ViewMode[] = ["synapses", "ideias", "metanoia", "conhecendo", "books", "estudo"];

function Mais() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function MobileNav({
  viewMode,
  onHoje,
  onSelect,
  onMenu,
  onNovaTarefa,
  onFalarComFaro,
}: {
  viewMode: ViewMode;
  onHoje: () => void;
  onSelect: (modo: ViewMode) => void;
  onMenu: () => void;
  onNovaTarefa: () => void;
  onFalarComFaro: () => void;
}) {
  const [folha, setFolha] = useState<"criar" | "aprender" | null>(null);
  const hojeAtivo = viewMode === "day" || viewMode === "dashboard";
  const aprenderAtivo = MODOS_DE_APRENDER.includes(viewMode);

  function ir(fn: () => void) {
    setFolha(null);
    fn();
  }

  const opcoes: Record<"criar" | "aprender", { rotulo: string; acao: () => void }[]> = {
    criar: [
      { rotulo: "Nova tarefa", acao: onNovaTarefa },
      { rotulo: "Lembrete", acao: () => onSelect("reminders") },
      { rotulo: "Ideia ou estudo", acao: () => onSelect("ideias") },
      { rotulo: "Sinapse", acao: () => onSelect("synapses") },
    ],
    aprender: [
      { rotulo: "Metanoia", acao: () => onSelect("metanoia") },
      { rotulo: "Sinapses", acao: () => onSelect("synapses") },
      { rotulo: "Ideias e Estudos", acao: () => onSelect("ideias") },
      { rotulo: "Conhecendo você", acao: () => onSelect("conhecendo") },
      { rotulo: "Livros, filmes e séries", acao: () => onSelect("books") },
    ],
  };

  const item = (rotulo: string, icone: ReactNode, ativo: boolean, onClick: () => void, extra = "") => (
    <button type="button" className={"mnav-item" + (ativo ? " ativo" : "") + extra} onClick={onClick} aria-current={ativo ? "page" : undefined}>
      <span className="mnav-icone">{icone}</span>
      <span className="mnav-rotulo">{rotulo}</span>
    </button>
  );

  return (
    <>
      {folha && (
        <>
          <div className="mnav-fundo" onClick={() => setFolha(null)} />
          <div className="mnav-folha" role="dialog" aria-label={folha === "criar" ? "Criar" : "Aprender"}>
            <div className="mnav-folha-titulo">{folha === "criar" ? "Criar" : "Aprender"}</div>
            {opcoes[folha].map((o) => (
              <button key={o.rotulo} type="button" className="mnav-folha-opcao" onClick={() => ir(o.acao)}>
                {o.rotulo}
              </button>
            ))}
          </div>
        </>
      )}
      <nav className="mnav" aria-label="Atalhos">
        {item("Hoje", <HomeIcon />, hojeAtivo && !folha, () => ir(onHoje))}
        {item("Criar", <Mais />, folha === "criar", () => setFolha(folha === "criar" ? null : "criar"))}
        {/* O FARO no meio, só o símbolo: abre o assistente, onde se fala ou escreve para pedir tarefa, lembrete ou tirar dúvida. */}
        <button type="button" className="mnav-item mnav-faro" aria-label="Falar com o FARO" onClick={() => ir(onFalarComFaro)}>
          <span className="mnav-faro-bola">
            <Image src="/faro-mascote.svg" alt="" width={44} height={40} className="mnav-faro-img" />
          </span>
        </button>
        {item("Aprender", aprenderAtivo ? <BoltIcon filled /> : <BookOpenIcon />, aprenderAtivo || folha === "aprender", () => setFolha(folha === "aprender" ? null : "aprender"))}
        {item("Menu", <MenuIcon />, false, () => ir(onMenu))}
      </nav>
    </>
  );
}
