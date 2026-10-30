"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BellIcon, BoltIcon, BookOpenIcon, HomeIcon } from "./icons";
import { MODOS_DE_APRENDER, Mais, opcoesDoMenu } from "./MobileNav";
import type { ViewMode } from "./Sidebar";

/**
 * Bolinha do FARO no computador: fechada é só o símbolo, no centro embaixo; com o mouse em cima (ou Tab)
 * abre uma barra para os dois lados (Hoje, Criar | FARO | Aprender, Lembretes). Clicar no meio abre o assistente
 * e já começa a ouvir. Só aparece em tela larga (CSS); no celular vale o menu inferior.
 */
export function DockFaro({
  viewMode,
  onHoje,
  onSelect,
  onNovaTarefa,
  onFalarComFaro,
}: {
  viewMode: ViewMode;
  onHoje: () => void;
  onSelect: (modo: ViewMode) => void;
  onNovaTarefa: () => void;
  onFalarComFaro: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);
  const [folha, setFolha] = useState<"criar" | "aprender" | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const saida = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aberta = hover || foco || folha !== null;
  const hojeAtivo = viewMode === "day" || viewMode === "dashboard";
  const aprenderAtivo = MODOS_DE_APRENDER.includes(viewMode);
  const opcoes = opcoesDoMenu(onSelect, onNovaTarefa);

  useEffect(
    () => () => {
      if (saida.current) clearTimeout(saida.current);
    },
    [],
  );

  // Esc fecha a barra; clique fora fecha a folha de opções.
  useEffect(() => {
    if (!aberta) return;
    function fecharTudo() {
      setFolha(null);
      setFoco(false);
      setHover(false);
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fecharTudo();
    }
    function aoClicar(e: MouseEvent) {
      if (!raiz.current?.contains(e.target as Node)) setFolha(null);
    }
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicar);
    };
  }, [aberta]);

  function ir(fn: () => void) {
    setFolha(null);
    setFoco(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
    fn();
  }

  const item = (rotulo: string, icone: ReactNode, ativo: boolean, onClick: () => void) => (
    <button type="button" className={"dock-item" + (ativo ? " ativo" : "")} onClick={onClick} aria-current={ativo ? "page" : undefined}>
      <span className="dock-icone">{icone}</span>
      <span className="dock-rotulo">{rotulo}</span>
    </button>
  );

  return (
    <div
      ref={raiz}
      className={"dock" + (aberta ? " aberta" : "")}
      onMouseEnter={() => {
        if (saida.current) clearTimeout(saida.current);
        setHover(true);
      }}
      onMouseLeave={() => {
        saida.current = setTimeout(() => setHover(false), 250);
      }}
      onFocus={(e) => {
        // Só o teclado abre pelo foco; o clique com o mouse já abre pelo hover.
        if (e.target.matches(":focus-visible")) setFoco(true);
      }}
      onBlur={(e) => {
        if (!raiz.current?.contains(e.relatedTarget as Node | null)) setFoco(false);
      }}
    >
      {folha && (
        <div className={"dock-folha dock-folha-" + folha} role="dialog" aria-label={folha === "criar" ? "Criar" : "Aprender"}>
          <div className="dock-folha-titulo">{folha === "criar" ? "Criar" : "Aprender"}</div>
          {opcoes[folha].map((o) => (
            <button key={o.rotulo} type="button" className="dock-folha-opcao" onClick={() => ir(o.acao)}>
              {o.rotulo}
            </button>
          ))}
        </div>
      )}
      <nav className="dock-pilula" aria-label="Atalhos">
        {/* O FARO vem primeiro no código para o teclado cair nele e abrir a barra; na tela fica no meio. */}
        <button type="button" className="dock-bola" aria-label="Falar com o FARO" onClick={() => ir(onFalarComFaro)}>
          <Image src="/faro-mascote.svg" alt="" width={44} height={40} className="dock-bola-img" />
        </button>
        <div className="dock-grupo dock-grupo-esq">
          {item("Hoje", <HomeIcon />, hojeAtivo && !folha, () => ir(onHoje))}
          {item("Criar", <Mais />, folha === "criar", () => setFolha(folha === "criar" ? null : "criar"))}
        </div>
        <div className="dock-grupo dock-grupo-dir">
          {item("Aprender", aprenderAtivo ? <BoltIcon filled /> : <BookOpenIcon />, aprenderAtivo || folha === "aprender", () =>
            setFolha(folha === "aprender" ? null : "aprender"),
          )}
          {item("Lembretes", <BellIcon filled={viewMode === "reminders"} />, viewMode === "reminders", () => ir(() => onSelect("reminders")))}
        </div>
      </nav>
    </div>
  );
}
