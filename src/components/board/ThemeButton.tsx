"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

const CHAVE = "faro-tema";

/**
 * Quem manda no tema é o atributo `data-theme` do <html>, escrito pelo script
 * do `layout.tsx` antes do primeiro pixel. Este botão não guarda uma segunda
 * cópia dessa verdade — ele LÊ o atributo e observa quando ele muda.
 *
 * Por isso `useSyncExternalStore` e não `useState` + `useEffect`: o tema é
 * estado de fora do React, e duas cópias da mesma verdade é como uma delas
 * acaba errada.
 */
function inscrever(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observador.disconnect();
}

function lerNoNavegador() {
  return document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
}

/** No servidor o atributo ainda não existe — e fingir que sim faria o ícone
 *  errado piscar por um quadro na hidratação. */
function lerNoServidor() {
  return null;
}

/**
 * Botão de tema da barra de cima.
 *
 * A escolha mora no `localStorage`, não no banco: tema é preferência DESTE
 * aparelho. O Leandro pode querer escuro no celular à noite e claro no
 * computador de dia, e salvar no banco tiraria essa liberdade dele.
 */
export function ThemeButton() {
  const tema = useSyncExternalStore(inscrever, lerNoNavegador, lerNoServidor);
  const escuro = tema === "escuro";

  function trocar() {
    const novo = escuro ? "claro" : "escuro";
    // Escreve só no atributo: o observador acima cuida de re-renderizar.
    document.documentElement.dataset.theme = novo === "escuro" ? "dark" : "light";
    try {
      window.localStorage.setItem(CHAVE, novo);
    } catch {
      // Navegador sem armazenamento: o tema vale só até recarregar a página.
    }
  }

  return (
    <button
      className="icon-btn"
      type="button"
      onClick={trocar}
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      // Antes de hidratar não dá pra saber o tema; o ícone entra invisível pra
      // não piscar o símbolo errado.
      style={tema === null ? { opacity: 0 } : undefined}
    >
      {escuro ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
