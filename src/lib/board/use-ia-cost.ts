"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MONTH_NAMES_FULL } from "@/lib/date-utils";
import { chaveDoMes } from "@/lib/ia/custo";

/**
 * O gasto com a IA, do mês corrente e dos anteriores (tabela `ia_uso`, que só o
 * servidor grava). Mesma ideia do useWhatsAppCost: a conta vive aqui porque o
 * número aparece em dois lugares (Configurações e Dashboard), e duas cópias
 * da mesma conta divergem com o tempo.
 */
export interface MesDaIA {
  chave: string; // "2026-10"
  rotulo: string; // "Mês atual", "setembro"…
  ehAtual: boolean;
  conversas: number;
  custoBrl: number;
  tokensEntrada: number;
  tokensSaida: number;
}

export interface ResumoDaIA {
  noMes: MesDaIA;
  meses: MesDaIA[]; // do mais recente ao mais antigo, com o atual
}

export function useIaCost(): ResumoDaIA | null {
  const [resumo, setResumo] = useState<ResumoDaIA | null>(null);

  useEffect(() => {
    let vivo = true;
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 12, 1).toISOString();
    createClient()
      .from("ia_uso")
      .select("created_at, custo_brl, tokens_entrada, tokens_saida, tokens_cache_leitura, tokens_cache_escrita")
      .gte("created_at", inicio)
      .order("created_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        if (!vivo) return;
        const atual = chaveDoMes(agora.toISOString());
        const anoAtual = Number(atual.slice(0, 4));
        const porMes = new Map<string, MesDaIA>();
        const garantir = (chave: string) => {
          let m = porMes.get(chave);
          if (!m) {
            const [ano, mes] = chave.split("-");
            const nome = MONTH_NAMES_FULL[Number(mes) - 1];
            m = {
              chave,
              rotulo: chave === atual ? "Mês atual" : Number(ano) === anoAtual ? nome : `${nome} de ${ano}`,
              ehAtual: chave === atual,
              conversas: 0,
              custoBrl: 0,
              tokensEntrada: 0,
              tokensSaida: 0,
            };
            porMes.set(chave, m);
          }
          return m;
        };
        garantir(atual);
        for (const u of data ?? []) {
          const m = garantir(chaveDoMes(u.created_at));
          m.conversas += 1;
          m.custoBrl += Number(u.custo_brl);
          // Entrada = tudo o que foi lido (novo + cache), para o número dizer o tamanho real do que foi enviado.
          m.tokensEntrada += u.tokens_entrada + u.tokens_cache_leitura + u.tokens_cache_escrita;
          m.tokensSaida += u.tokens_saida;
        }
        const meses = [...porMes.values()].sort((a, b) => b.chave.localeCompare(a.chave));
        setResumo({ noMes: porMes.get(atual)!, meses });
      });
    return () => {
      vivo = false;
    };
  }, []);

  return resumo;
}
