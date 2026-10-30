"use client";

import { useCallback, useEffect, useState } from "react";

const MINHA_VERSAO = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const A_CADA_MS = 5 * 60 * 1000;

/**
 * Quando sai uma versão nova do app, mostra um botão "Atualizar o aplicativo" (celular e computador).
 * Compara a versão que esta tela carregou com a que está no ar; se não souber a versão (fora da Vercel), não aparece.
 */
export function AtualizarApp() {
  const [nova, setNova] = useState(false);

  const conferir = useCallback(async () => {
    if (!MINHA_VERSAO) return;
    try {
      const r = await fetch("/api/versao", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { id?: string };
      if (d.id && d.id !== MINHA_VERSAO) setNova(true);
    } catch {
      // Sem rede: tenta de novo na próxima vez.
    }
  }, []);

  useEffect(() => {
    if (!MINHA_VERSAO) return;
    const primeira = window.setTimeout(conferir, 15000);
    const relogio = window.setInterval(conferir, A_CADA_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void conferir();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      window.clearTimeout(primeira);
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [conferir]);

  async function atualizar() {
    try {
      const chaves = await caches.keys();
      await Promise.all(chaves.map((c) => caches.delete(c)));
    } catch {
      // Sem cache para limpar.
    }
    window.location.reload();
  }

  if (!nova) return null;
  return (
    <div className="atualizar-app" role="status">
      <span>Tem uma versão nova do FARO.</span>
      <button type="button" className="btn btn-accent" onClick={() => void atualizar()}>
        Atualizar o aplicativo
      </button>
    </div>
  );
}
