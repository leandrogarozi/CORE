"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useBoard, type UseBoard } from "@/lib/board/use-board";
import { useColumnWidths, type UseColumnWidths } from "@/lib/board/column-widths";
import type { ScopeChoice, Task } from "@/lib/types";

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

export interface FocusRequest {
  kind: "task" | "reminder" | "book";
  id: string;
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
  // Leva pro dia da tarefa e abre ela em edição — quem sabe navegar é o BoardApp,
  // então ele registra o handler e as telas de dentro (Dashboard) só chamam.
  openTaskInDay: (task: Task) => void;
  setOpenTaskInDayHandler: (fn: ((task: Task) => void) | null) => void;
  focusRequest: FocusRequest | null;
  requestFocus: (req: FocusRequest) => void;
  consumeFocusRequest: (kind: FocusRequest["kind"], id: string) => void;
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
  const [openTaskInDayHandler, setOpenTaskInDayHandler] = useState<((task: Task) => void) | null>(null);
  const openTaskInDay = useCallback(
    (task: Task) => {
      openTaskInDayHandler?.(task);
    },
    [openTaskInDayHandler]
  );
  const openProject = useCallback(
    (id: string) => {
      openProjectHandler?.(id);
    },
    [openProjectHandler]
  );

  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const requestFocus = useCallback((req: FocusRequest) => setFocusRequest(req), []);
  const consumeFocusRequest = useCallback((kind: FocusRequest["kind"], id: string) => {
    setFocusRequest((cur) => (cur && cur.kind === kind && cur.id === id ? null : cur));
  }, []);

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
        openTaskInDay,
        setOpenTaskInDayHandler,
        focusRequest,
        requestFocus,
        consumeFocusRequest,
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
