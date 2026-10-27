import { useSyncExternalStore } from "react";
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
export function useTemaDoCartao(tema: MetanoiaTema): "claro" | "escuro" {
  const doApp = useSyncExternalStore(inscreverTema, temaDoApp, () => "claro" as const);
  return tema === "auto" ? doApp : tema;
}
