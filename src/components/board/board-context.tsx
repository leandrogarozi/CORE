"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useBoard, type UseBoard } from "@/lib/board/use-board";
import { useColumnWidths, type UseColumnWidths } from "@/lib/board/column-widths";
import type { ScopeChoice } from "@/lib/types";

interface ScopeModalState {
  open: boolean;
  question: string;
  onChoose: ((choice: ScopeChoice) => void) | null;
}

interface ConfirmModalState {
  open: boolean;
  question: string;
  onConfirm: (() => void) | null;
  icon: ReactElement | null;
}

interface BoardCtxValue {
  board: UseBoard;
  sortByQuick: boolean;
  setSortByQuick: (v: boolean) => void;
  askScope: (question: string, onChoose: (choice: ScopeChoice) => void) => void;
  scopeModal: ScopeModalState;
  closeScopeModal: () => void;
  askConfirm: (question: string, onConfirm: () => void, icon?: ReactElement) => void;
  confirmModal: ConfirmModalState;
  closeConfirmModal: () => void;
  columns: UseColumnWidths;
  openProject: (id: string) => void;
  setOpenProjectHandler: (fn: ((id: string) => void) | null) => void;
}

const BoardCtx = createContext<BoardCtxValue | null>(null);

export function BoardProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const board = useBoard(userId);
  const [sortByQuick, setSortByQuick] = useState(false);
  const [scopeModal, setScopeModal] = useState<ScopeModalState>({ open: false, question: "", onChoose: null });
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    question: "",
    onConfirm: null,
    icon: null,
  });
  const columns = useColumnWidths();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a preferência salva do navegador uma vez, no mount
    if (localStorage.getItem("faro-sort-by-quick") === "1") setSortByQuick(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("faro-sort-by-quick", sortByQuick ? "1" : "0");
  }, [sortByQuick]);

  const askScope = useCallback((question: string, onChoose: (choice: ScopeChoice) => void) => {
    setScopeModal({ open: true, question, onChoose });
  }, []);

  const closeScopeModal = useCallback(() => {
    setScopeModal({ open: false, question: "", onChoose: null });
  }, []);

  const askConfirm = useCallback((question: string, onConfirm: () => void, icon?: ReactElement) => {
    setConfirmModal({ open: true, question, onConfirm, icon: icon ?? null });
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfirmModal({ open: false, question: "", onConfirm: null, icon: null });
  }, []);

  const [openProjectHandler, setOpenProjectHandler] = useState<((id: string) => void) | null>(null);
  const openProject = useCallback(
    (id: string) => {
      openProjectHandler?.(id);
    },
    [openProjectHandler]
  );

  return (
    <BoardCtx.Provider
      value={{
        board,
        sortByQuick,
        setSortByQuick,
        askScope,
        scopeModal,
        closeScopeModal,
        askConfirm,
        confirmModal,
        closeConfirmModal,
        columns,
        openProject,
        setOpenProjectHandler,
      }}
    >
      {children}
    </BoardCtx.Provider>
  );
}

export function useBoardCtx() {
  const ctx = useContext(BoardCtx);
  if (!ctx) throw new Error("useBoardCtx must be used inside BoardProvider");
  return ctx;
}
