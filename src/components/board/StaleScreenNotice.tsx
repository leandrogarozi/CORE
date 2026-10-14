"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBoardCtx } from "./board-context";
import { WarningIcon } from "./icons";
import { createClient } from "@/lib/supabase/client";
import { ID_DESTA_TELA } from "@/lib/supabase/device";

/**
 * Aviso "Sua tela está desatualizada".
 *
 * Quando ele mexe no FARO em outro computador (ou outra aba) e volta para uma
 * tela que ficou parada, o que está aqui é uma foto velha: trabalhar nela
 * sobrescreve o que foi feito lá. O banco anota quando cada tela escreve
 * (gatilho `faro_escrita`); aqui perguntamos se OUTRA tela escreveu depois de
 * a nossa carregar. Se sim, o aviso fica na tela até ele atualizar.
 *
 * Confere ao voltar para a aba, ao focar a janela e a cada 45 s com a aba à vista.
 */
const MARGEM_MS = 5000; // escrita de outra tela nos 5 s ao redor do carregamento não conta

type Resposta = { agora?: string; outro?: boolean } | null;

export function StaleScreenNotice() {
  const { board } = useBoardCtx();
  const supabase = useMemo(() => createClient(), []);
  const [desatualizada, setDesatualizada] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const desde = useRef<string | null>(null);

  const consultar = useCallback(
    async (desdeIso: string | null): Promise<Resposta> => {
      const { data, error } = await supabase.rpc("faro_outro_dispositivo_mexeu", {
        p_device: ID_DESTA_TELA,
        p_desde: desdeIso,
      });
      if (error) return null;
      return data as Resposta;
    },
    [supabase]
  );

  // Marca "a tela carregou agora" (hora do servidor, para não depender do relógio do computador).
  const marcarCarregada = useCallback(async () => {
    const r = await consultar(null);
    if (r?.agora) desde.current = new Date(new Date(r.agora).getTime() - MARGEM_MS).toISOString();
  }, [consultar]);

  useEffect(() => {
    void marcarCarregada();
  }, [marcarCarregada]);

  useEffect(() => {
    async function conferir() {
      if (document.visibilityState === "hidden") return;
      if (!desde.current) return void (await marcarCarregada());
      const r = await consultar(desde.current);
      if (r?.outro) setDesatualizada(true);
    }
    const timer = window.setInterval(conferir, 45_000);
    document.addEventListener("visibilitychange", conferir);
    window.addEventListener("focus", conferir);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", conferir);
      window.removeEventListener("focus", conferir);
    };
  }, [consultar, marcarCarregada]);

  async function atualizar() {
    setAtualizando(true);
    try {
      await board.reload();
      await marcarCarregada();
      setDesatualizada(false);
    } finally {
      setAtualizando(false);
    }
  }

  if (!desatualizada) return null;
  return (
    <div className="stale-banner" role="alert">
      <WarningIcon />
      <span>
        <strong>Sua tela está desatualizada.</strong> Você mexeu no FARO em outro computador ou aba. Atualize antes de
        continuar, para não sobrescrever o que já foi feito.
      </span>
      <button type="button" className="btn btn-accent" disabled={atualizando} onClick={atualizar}>
        {atualizando ? "Atualizando…" : "Atualizar agora"}
      </button>
    </div>
  );
}
