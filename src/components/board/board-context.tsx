"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useBoard, type UseBoard } from "@/lib/board/use-board";
import { useColumnWidths, type UseColumnWidths } from "@/lib/board/column-widths";
import type { ScopeChoice } from "@/lib/types";

interface ScopeModalState {
  open: boolean;
  question: string;
  onChoose: ((choice: ScopeChoice) => void) | null;
}

interface BoardCtxValue {
  board: UseBoard;
  sortByQuick: boolean;
  setSortByQuick: (v: boolean) => void;
  askScope: (question: string, onChoose: (choice: ScopeChoice) => void) => void;
  scopeModal: ScopeModalState;
  closeScopeModal: () => void;
  columns: UseColumnWidths;
}

const BoardCtx = createContext<BoardCtxValue | null>(null);

export function BoardProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const board = useBoard(userId);
  const [sortByQuick, setSortByQuick] = useState(false);
  const [scopeModal, setScopeModal] = useState<ScopeModalState>({ open: false, question: "", onChoose: null });
  const columns = useColumnWidths();

  const askScope = useCallback((question: string, onChoose: (choice: ScopeChoice) => void) => {
    setScopeModal({ open: true, question, onChoose });
  }, []);

  const closeScopeModal = useCallback(() => {
    setScopeModal({ open: false, question: "", onChoose: null });
  }, []);

  return (
    <BoardCtx.Provider
      value={{ board, sortByQuick, setSortByQuick, askScope, scopeModal, closeScopeModal, columns }}
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
