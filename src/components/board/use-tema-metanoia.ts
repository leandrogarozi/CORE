import { useSyncExternalStore } from "react";
import { corEhEscura, corValida } from "@/lib/metanoia";
import type { MetanoiaTema } from "@/lib/types";

function temaDoApp(): "claro" | "escuro" {
  return document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
}

function inscreverTema(avisar: () => void) {
  const o = new MutationObserver(avisar);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}

/** A cor do cartão da Metanoia: "auto" segue o tema do app; o servidor não sabe qual é, então começa claro e acerta na hidratação. */
export function useTemaDoCartao(tema: MetanoiaTema, cor?: string | null): "claro" | "escuro" {
  const doApp = useSyncExternalStore(inscreverTema, temaDoApp, () => "claro" as const);
  // Com cor própria, o texto segue o fundo: escuro pede texto branco, claro pede texto preto.
  if (cor && corValida(cor)) return corEhEscura(cor) ? "escuro" : "claro";
  return tema === "auto" ? doApp : tema;
}
