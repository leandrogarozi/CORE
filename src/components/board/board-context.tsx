"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useBoard, type UseBoard } from "@/lib/board/use-board";
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
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
}

const BoardCtx = createContext<BoardCtxValue | null>(null);

export function BoardProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const board = useBoard(userId);
  const [sortByQuick, setSortByQuick] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scopeModal, setScopeModal] = useState<ScopeModalState>({ open: false, question: "", onChoose: null });

  const askScope = useCallback((question: string, onChoose: (choice: ScopeChoice) => void) => {
    setScopeModal({ open: true, question, onChoose });
  }, []);

  const closeScopeModal = useCallback(() => {
    setScopeModal({ open: false, question: "", onChoose: null });
  }, []);

  return (
    <BoardCtx.Provider
      value={{ board, sortByQuick, setSortByQuick, askScope, scopeModal, closeScopeModal, settingsOpen, setSettingsOpen }}
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
