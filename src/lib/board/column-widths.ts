"use client";

import { useCallback, useEffect, useState } from "react";

export const TASK_COLUMNS = [
  { key: "status", label: "Status", defaultWidth: 36, minWidth: 30 },
  { key: "quick", label: "Vel.Ex", defaultWidth: 50, minWidth: 36 },
  { key: "desc", label: "Descrição", defaultWidth: 230, minWidth: 100 },
  { key: "category", label: "Categoria", defaultWidth: 100, minWidth: 60 },
  { key: "priority", label: "Prioridade", defaultWidth: 80, minWidth: 50 },
  { key: "play", label: "Play", defaultWidth: 66, minWidth: 40 },
  { key: "duplicate", label: "Copiar", defaultWidth: 50, minWidth: 36 },
  { key: "delete", label: "Excluir", defaultWidth: 50, minWidth: 36 },
] as const;

export type ColumnKey = (typeof TASK_COLUMNS)[number]["key"];

// v2: bumped to discard widths stored before the icon columns became
// center-aligned, which could leave a column looking stretched with no
// obvious way to fix it.
const STORAGE_KEY = "faro-task-col-widths-v2";

function loadStoredWidths(): Partial<Record<ColumnKey, number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useColumnWidths() {
  const [widths, setWidths] = useState<Partial<Record<ColumnKey, number>>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration on mount
    setWidths(loadStoredWidths());
  }, []);

  const widthFor = useCallback(
    (key: ColumnKey) => {
      const stored = widths[key];
      if (stored) return stored;
      return TASK_COLUMNS.find((c) => c.key === key)!.defaultWidth;
    },
    [widths]
  );

  const setColumnWidth = useCallback((key: ColumnKey, px: number) => {
    setWidths((prev) => {
      const col = TASK_COLUMNS.find((c) => c.key === key)!;
      const next = { ...prev, [key]: Math.max(col.minWidth, Math.round(px)) };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore write failures (private browsing, storage full, etc.)
      }
      return next;
    });
  }, []);

  const resetColumnWidth = useCallback((key: ColumnKey) => {
    setWidths((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore write failures (private browsing, storage full, etc.)
      }
      return next;
    });
  }, []);

  const gridTemplate = [
    "30px",
    ...TASK_COLUMNS.map((c) => {
      // Descrição fills any leftover row width until the user drags it to an
      // explicit size — avoids a dead strip of blank space after the last column.
      if (c.key === "desc" && widths.desc === undefined) {
        return `minmax(${c.defaultWidth}px, 1fr)`;
      }
      return `${widthFor(c.key)}px`;
    }),
  ].join(" ");

  return { widthFor, setColumnWidth, resetColumnWidth, gridTemplate };
}

export type UseColumnWidths = ReturnType<typeof useColumnWidths>;
