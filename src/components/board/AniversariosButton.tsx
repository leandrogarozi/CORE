"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";
import { createClient } from "@/lib/supabase/client";
import { GiftIcon } from "./icons";
import { diasAteAniversario, ordenarPorProximos } from "@/lib/board/aniversarios";
import { todayISO } from "@/lib/date-utils";
import type { ViewMode } from "./Sidebar";

/** A partir de quantos dias antes o bolinho acende. */
export const DIAS_DE_AVISO_DO_ANIVERSARIO = 3;

/**
 * O bolinho na barra de cima, ao lado dos Avisos. Apagado quando ninguém faz
 * aniversário nos próximos 3 dias; aceso (cor de destaque) quando há; com o
 * número de quem faz aniversário HOJE. Passar o mouse mostra quem e quando;
 * clicar abre a lista de Aniversários.
 *
 * Também acende (e conta) os cadastros novos do site que esperam o "Confirmar cliente":
 * enquanto houver um, o ícone fica aceso com o número, mesmo depois de o aviso ser lido.
 * A lista é buscada aqui (ao abrir, ao voltar para a aba e a cada 2 min), porque o app
 * não recarrega sozinho quando alguém se cadastra.
 */
export function AniversariosButton({ onNavigate }: { onNavigate: (modo: ViewMode) => void }) {
  const { board } = useBoardCtx();
  const supabase = useMemo(() => createClient(), []);
  const [remotos, setRemotos] = useState<{ id: string; name: string }[]>([]);
  const hoje = todayISO();

  const buscarPendentes = useCallback(async () => {
    const { data, error } = await supabase
      .from("birthdays")
      .select("id, name")
      .eq("aguardando_confirmacao", true)
      .is("deleted_at", null);
    if (!error && data) setRemotos(data);
  }, [supabase]);

  useEffect(() => {
    const primeira = setTimeout(buscarPendentes, 0);
    const aoVoltar = () => document.visibilityState === "visible" && buscarPendentes();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", buscarPendentes);
    const t = setInterval(buscarPendentes, 120000);
    return () => {
      clearTimeout(primeira);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", buscarPendentes);
      clearInterval(t);
    };
  }, [buscarPendentes]);

  // O que o app já conhece manda: se aqui já foi confirmado, não conta, mesmo que a busca ainda não tenha voltado.
  const conhecidos = new Map(board.state.birthdays.map((b) => [b.id, b]));
  const pendentes = [
    ...board.state.birthdays.filter((b) => b.pending).map((b) => ({ id: b.id, name: b.name })),
    ...remotos.filter((r) => !conhecidos.has(r.id)),
  ];
  const perto = ordenarPorProximos(board.state.birthdays, hoje).filter(
    (b) => diasAteAniversario(b, hoje) <= DIAS_DE_AVISO_DO_ANIVERSARIO
  );
  const hojeN = perto.filter((b) => diasAteAniversario(b, hoje) === 0).length;

  const dicaPendentes = pendentes.length
    ? `${pendentes.length === 1 ? "Cadastro" : pendentes.length + " cadastros"} do site aguardando confirmação: ${pendentes.map((p) => p.name.trim()).join(", ")}`
    : "";
  const dicaPerto = perto.length
    ? perto
        .map((b) => {
          const d = diasAteAniversario(b, hoje);
          return `${d === 0 ? "Hoje" : d === 1 ? "Amanhã" : `Em ${d} dias`}: aniversário de ${b.name.trim()}`;
        })
        .join("\n")
    : pendentes.length
      ? ""
      : `Aniversários (ninguém faz nos próximos ${DIAS_DE_AVISO_DO_ANIVERSARIO} dias)`;
  const dica = [dicaPendentes, dicaPerto].filter(Boolean).join("\n");
  const contagem = hojeN + pendentes.length;

  return (
    <button
      type="button"
      className={"icon-btn aviso-icon-btn aniv-btn" + (perto.length || pendentes.length ? " aviso-novo aniv-perto" : "")}
      aria-label={dica.replace(/\n/g, ". ")}
      title={dica}
      onClick={() => {
        // Cadastro novo que o app ainda não conhece: recarrega antes de abrir a lista.
        if (pendentes.some((p) => !conhecidos.has(p.id))) void board.reload();
        onNavigate("aniversarios");
      }}
    >
      <GiftIcon />
      {contagem > 0 && <span className="reminders-btn-count aviso-count">{contagem > 9 ? "9+" : contagem}</span>}
    </button>
  );
}
