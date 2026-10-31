"use client";

import { useEffect } from "react";
import { lerEstiloGuardado } from "@/lib/estilo";

/**
 * O estilo (flutuante, suave, clássico) e o tema (claro, escuro) moram em atributos do <html>, escritos por um script
 * antes do React entrar. Se o React precisar refazer a página inteira no navegador (um erro de hidratação, por exemplo),
 * esses atributos se perdem e o app abre no visual antigo, sem os botões roxos, até a pessoa escolher o estilo de novo
 * em Configurações. Aqui eles são recolocados na hora, com o que está guardado neste aparelho, e o padrão é o flutuante.
 */
export function GuardaDoEstilo() {
  useEffect(() => {
    const html = document.documentElement;
    function garantir() {
      let tema: string | null = null;
      try {
        tema = window.localStorage.getItem("faro-tema");
      } catch {
        // Sem armazenamento: vale o padrão.
      }
      if (!html.dataset.estilo) html.dataset.estilo = lerEstiloGuardado();
      if (!html.dataset.theme) {
        const escuro = tema === "escuro" || (tema !== "claro" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        html.dataset.theme = escuro ? "dark" : "light";
      }
    }
    garantir();
    // iPhone: o Safari amplia a página ao tocar num campo; limitar a escala máxima evita isso sem engordar a letra dos campos.
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if (meta && !/maximum-scale/.test(meta.content)) meta.content = meta.content + ", maximum-scale=1";
    }
    const o = new MutationObserver(garantir);
    o.observe(html, { attributes: true, attributeFilter: ["data-estilo", "data-theme"] });
    return () => o.disconnect();
  }, []);
  return null;
}
