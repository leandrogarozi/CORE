"use client";

import { useEffect, type ReactNode } from "react";
import { BellIcon, BoltIcon, CommentIcon, LinkIcon,
  ArchiveIcon, BookOpenIcon, BookIcon, GiftIcon, CarIcon, CartIcon, ChartIcon, ChecklistIcon, FolderIcon, HomeIcon, MealIcon, PillIcon, RtQuoteIcon, SettingsIcon, TrashIcon, UserIcon, UsersGroupIcon, WeekIcon } from "./icons";

export type ViewMode =
  | "day"
  | "week"
  | "dashboard"
  | "settings"
  | "profile"
  | "books"
  | "calendar"
  | "reminders"
  | "synapses"
  | "ideias"
  | "compras"
  | "aniversarios"
  | "cadastros"
  | "clientes"
  | "conhecendo"
  | "estudo"
  | "manutencao"
  | "dispensa"
  | "medications"
  | "checklists"
  | "diet"
  | "projects"
  | "meetings"
  | "metanoia"
  | "tutorial"
  | "embreve"
  | "feedbacks"
  | "trash";

type ItemDoMenu = {
  modo: ViewMode;
  rotulo: string;
  icone: ReactNode;
  destaque?: boolean;
  selo?: "paraRevisar" | "aniversarios" | "frases";
  /** Só a conta dona vê (depende das páginas de cadastro do próprio dono). */
  somenteDono?: boolean;
};

export const GRUPOS_DO_MENU: { titulo: string; itens: ItemDoMenu[] }[] = [
  {
    titulo: "Hoje",
    itens: [
      { modo: "day", rotulo: "Painel", icone: <HomeIcon /> },
      { modo: "week", rotulo: "Semana", icone: <WeekIcon /> },
      { modo: "dashboard", rotulo: "Dashboard", icone: <ChartIcon /> },
      { modo: "reminders", rotulo: "Lembretes", icone: <BellIcon /> },
      { modo: "meetings", rotulo: "Reuniões", icone: <UsersGroupIcon /> },
      { modo: "projects", rotulo: "Projetos", icone: <FolderIcon /> },
    ],
  },
  {
    titulo: "Aprender",
    itens: [
      { modo: "conhecendo", rotulo: "Conhecendo você", icone: <UserIcon size={13} />, destaque: true, selo: "paraRevisar" },
      { modo: "metanoia", rotulo: "Metanoia", icone: <RtQuoteIcon />, selo: "frases" },
      { modo: "synapses", rotulo: "Novas Sinapses", icone: <BoltIcon /> },
      { modo: "ideias", rotulo: "Ideias e Estudos", icone: <BoltIcon /> },
      { modo: "books", rotulo: "Livros / Filmes e séries", icone: <BookIcon /> },
      { modo: "estudo", rotulo: "Plano de Estudo", icone: <BookOpenIcon /> },
    ],
  },
  {
    titulo: "Pessoas",
    itens: [
      { modo: "aniversarios", rotulo: "Aniversários", icone: <GiftIcon />, selo: "aniversarios" },
      { modo: "cadastros", rotulo: "Cadastros", icone: <LinkIcon />, somenteDono: true },
      { modo: "clientes", rotulo: "Clientes", icone: <UsersGroupIcon />, somenteDono: true },
      { modo: "feedbacks", rotulo: "Feedbacks recebidos", icone: <CommentIcon />, somenteDono: true },
    ],
  },
  {
    titulo: "Saúde e casa",
    itens: [
      { modo: "medications", rotulo: "Medicamentos", icone: <PillIcon /> },
      { modo: "diet", rotulo: "Dieta", icone: <MealIcon /> },
      { modo: "manutencao", rotulo: "Manutenção", icone: <CarIcon /> },
      { modo: "compras", rotulo: "Compras", icone: <CartIcon /> },
      { modo: "dispensa", rotulo: "Dispensa", icone: <ArchiveIcon /> },
      { modo: "checklists", rotulo: "Checklists", icone: <ChecklistIcon /> },
    ],
  },
];

/** Quais itens do menu a pessoa pode desligar (o Painel, a Lixeira e as Configurações ficam sempre). */
export function menuLigado(flags: Record<string, boolean> | undefined, modo: ViewMode): boolean {
  return flags?.["menu_" + modo] !== false;
}

export function Sidebar({
  open,
  viewMode,
  onSelect,
  onClose,
  paraRevisar = 0,
  aniversariosPendentes = 0,
  frasesParaRevisar = 0,
  modoDono = false,
  flags,
  onFeedback,
}: {
  open: boolean;
  viewMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
  onClose: () => void;
  /** Quantos itens de "Conhecendo você" esperam aprovação (a IA propôs). */
  paraRevisar?: number;
  aniversariosPendentes?: number;
  /** Frases da Metanoia esperando aprovação. */
  frasesParaRevisar?: number;
  modoDono?: boolean;
  flags?: Record<string, boolean>;
  onFeedback: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div className={"sidebar-backdrop" + (open ? " open" : "")} onClick={onClose} aria-hidden="true" />
      <nav className={"sidebar" + (open ? " open" : "")} aria-label="Menu principal">
        <div className="sidebar-brand">FARO</div>

        {/* Agrupado por assunto: antes era uma fila única de 20 itens e achar Clientes
            ou Dieta pedia ler a lista inteira. Os itens e a ordem dentro de cada grupo
            são os mesmos de antes. */}
        {GRUPOS_DO_MENU.map((grupo) => (
          <div className="sidebar-section" key={grupo.titulo}>
            <div className="sidebar-section-label">{grupo.titulo}</div>
            {grupo.itens.filter((item) => (!item.somenteDono || modoDono) && (item.modo === "day" || menuLigado(flags, item.modo))).map((item) => {
              const numero = item.selo === "paraRevisar" ? paraRevisar : item.selo === "aniversarios" ? aniversariosPendentes : item.selo === "frases" ? frasesParaRevisar : 0;
              return (
                <button
                  key={item.modo}
                  type="button"
                  className={"sidebar-item" + (item.destaque ? " sidebar-item-destaque" : "") + (viewMode === item.modo ? " active" : "")}
                  onClick={() => onSelect(item.modo)}
                >
                  {item.icone} {item.rotulo}
                  {numero > 0 && (
                    <span
                      className="sidebar-badge"
                      title={item.selo === "paraRevisar" ? "Aprendizados esperando você aprovar" : item.selo === "frases" ? "Frases esperando você aprovar" : "Cadastros do site aguardando confirmação"}
                    >
                      {numero}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-section sidebar-section-bottom">
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "trash" ? " active" : "")}
            onClick={() => onSelect("trash")}
          >
            <TrashIcon /> Lixeira
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "embreve" ? " active" : "")}
            onClick={() => onSelect("embreve")}
          >
            <ChartIcon /> Em breve
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "tutorial" ? " active" : "")}
            onClick={() => onSelect("tutorial")}
          >
            <BookOpenIcon /> Como usar
          </button>
          <button type="button" className="sidebar-item" onClick={onFeedback}>
            <CommentIcon /> Canal de feedback
          </button>
          <button
            type="button"
            className={"sidebar-item" + (viewMode === "settings" ? " active" : "")}
            onClick={() => onSelect("settings")}
          >
            <SettingsIcon /> Configurações
          </button>
        </div>
      </nav>
    </>
  );
}
