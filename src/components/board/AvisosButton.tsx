"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { InboxIcon } from "./icons";
import type { ViewMode } from "./Sidebar";

/**
 * Caixa de avisos da home: tudo que o FARO quis te contar e você pode não ter
 * visto (a IA propôs um aprendizado, criou uma tarefa...). Cada aviso fica até
 * ser lido, diz o que aconteceu e leva até o lugar onde está.
 *
 * Os avisos são gravados pelo servidor (conector da IA); aqui só se lê e se
 * marca como lido. A caixa recarrega ao abrir o app, ao voltar para ele e de 2
 * em 2 minutos, para não depender de recarregar a página.
 */
interface Aviso {
  id: string;
  titulo: string;
  corpo: string;
  destino: string | null;
  criadoEm: string;
  lido: boolean;
}

const ONDE: Record<string, { rotulo: string; modo: ViewMode }> = {
  conhecendo: { rotulo: "Abrir Conhecendo você", modo: "conhecendo" },
  aniversarios: { rotulo: "Abrir Aniversários", modo: "aniversarios" },
  cadastros: { rotulo: "Abrir Cadastros", modo: "cadastros" },
  day: { rotulo: "Ver as tarefas", modo: "day" },
  reminders: { rotulo: "Abrir Lembretes", modo: "reminders" },
};

function quando(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function AvisosButton({ onNavigate }: { onNavigate: (modo: ViewMode) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("faro_avisos")
      .select("id, titulo, corpo, destino, criado_em, lido_em")
      .order("criado_em", { ascending: false })
      .limit(30);
    if (error || !data) return;
    setAvisos(
      data.map((a) => ({ id: a.id, titulo: a.titulo, corpo: a.corpo, destino: a.destino, criadoEm: a.criado_em, lido: !!a.lido_em }))
    );
  }, [supabase]);

  useEffect(() => {
    // Fora do corpo do efeito: a primeira carga também é assíncrona.
    const primeira = setTimeout(carregar, 0);
    const aoVoltar = () => document.visibilityState === "visible" && carregar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", carregar);
    const t = setInterval(carregar, 120000);
    return () => {
      clearTimeout(primeira);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", carregar);
      clearInterval(t);
    };
  }, [carregar]);

  useEffect(() => {
    if (!open) return;
    function fora(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [open]);

  const naoLidos = avisos.filter((a) => !a.lido).length;

  async function marcarLidos(ids: string[]) {
    if (!ids.length) return;
    setAvisos((as) => as.map((a) => (ids.includes(a.id) ? { ...a, lido: true } : a)));
    await supabase.from("faro_avisos").update({ lido_em: new Date().toISOString() }).in("id", ids);
  }

  function abrir(a: Aviso) {
    const onde = a.destino ? ONDE[a.destino] : undefined;
    marcarLidos([a.id]);
    if (onde) {
      setOpen(false);
      onNavigate(onde.modo);
    }
  }

  function alternar(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
      carregar();
    }
    setOpen((v) => !v);
  }

  return (
    <>
      {/* Só o ícone, na barra de cima: a home já tem Reuniões e Lembretes e ficava cheia. */}
      <button
        ref={btnRef}
        type="button"
        className={"icon-btn aviso-icon-btn" + (naoLidos ? " aviso-novo" : "") + (open ? " active" : "")}
        aria-label={naoLidos ? `Avisos: ${naoLidos} não lido(s)` : "Avisos"}
        title={naoLidos ? `${naoLidos} aviso(s) para você ver` : "Avisos do FARO"}
        onClick={alternar}
      >
        <InboxIcon />
        {naoLidos > 0 && <span className="reminders-btn-count aviso-count">{naoLidos > 9 ? "9+" : naoLidos}</span>}
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="reminders-popover avisos-popover" ref={popRef} style={{ top: pos.top, right: pos.right }}>
            <div className="reminders-popover-head">
              <span>Avisos</span>
              {naoLidos > 0 && (
                <button type="button" className="reminders-popover-viewall" onClick={() => marcarLidos(avisos.filter((a) => !a.lido).map((a) => a.id))}>
                  Marcar todos como lidos
                </button>
              )}
            </div>
            {avisos.length === 0 ? (
              <div className="hp-empty">
                Nenhum aviso. Quando a IA propuser um aprendizado ou criar algo no FARO, ele aparece aqui.
              </div>
            ) : (
              <div className="avisos-lista">
                {avisos.map((a) => {
                  const onde = a.destino ? ONDE[a.destino] : undefined;
                  return (
                    <div key={a.id} className={"aviso-item" + (a.lido ? "" : " novo")}>
                      <div className="aviso-titulo">
                        {!a.lido && <span className="aviso-ponto" aria-label="não lido" />}
                        {a.titulo}
                        <span className="aviso-quando">{quando(a.criadoEm)}</span>
                      </div>
                      <div className="aviso-corpo">{a.corpo}</div>
                      <div className="aviso-acoes">
                        {onde && (
                          <button type="button" className="btn btn-accent" onClick={() => abrir(a)}>
                            {onde.rotulo}
                          </button>
                        )}
                        {!a.lido && (
                          <button type="button" className="btn btn-ghost" onClick={() => marcarLidos([a.id])}>
                            Marcar como lido
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
