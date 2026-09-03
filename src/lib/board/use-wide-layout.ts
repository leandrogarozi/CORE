"use client";

import { useState } from "react";

/** Preferência de largura expandida (900px -> 1300px) por tela, salva no navegador —
 * usada em Projetos, Lembretes e Livros pra caber mais colunas/texto sem cortar. */
export function useWideLayout(storageKey: string) {
  const [wide, setWide] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "1";
  });

  function toggleWide() {
    setWide((w) => {
      const next = !w;
      localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  }

  return { wide, toggleWide };
}
