"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * O resumo de envios e gasto do WhatsApp no mês.
 *
 * Mora aqui, e não dentro da tela, porque o número aparece em DOIS lugares —
 * Configurações e Dashboard. Duas cópias da mesma conta é como elas divergem:
 * bastaria alguém corrigir o limite do mês num lado e esquecer do outro, e o
 * app passaria a dizer duas verdades sobre quanto o Leandro gastou.
 */
export type ResumoDoZap = {
  noMes: number;
  em4Dias: number;
  falhas: number;
  entregues: number;
  naoEntregues: number;
  semConfirmacao: number;
};

export function useWhatsAppCost(): ResumoDoZap | null {
  const [resumo, setResumo] = useState<ResumoDoZap | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const agora = new Date();
    // Meia-noite do dia 1 no fuso de quem está olhando. A fatura da Meta fecha
    // por mês, então o contador do mês tem que virar junto com o calendário
    // dele — e não às 21h do dia 30, que é o que daria montar isso em UTC.
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
    const quatroDias = new Date(agora.getTime() - 4 * 24 * 3600 * 1000).toISOString();
    // 60 dias cobrem o mês corrente e o anterior — é tudo que o painel mostra.
    const desde = new Date(agora.getTime() - 60 * 24 * 3600 * 1000).toISOString();

    let vivo = true;
    supabase
      .from("whatsapp_sends")
      .select("sent_at, ok, delivery_status")
      .gte("sent_at", desde)
      .order("sent_at", { ascending: false })
      .then(({ data }) => {
        if (!vivo) return;
        const linhas = data ?? [];
        // Só o que a Meta aceitou custa. Tentativa que falhou não entra na
        // conta de gasto, mas entra no contador de falhas, que é outro assunto.
        const enviadas = linhas.filter((l) => l.ok);
        const aceitasNoMes = enviadas.filter((l) => l.sent_at >= inicioDoMes);
        setResumo({
          noMes: aceitasNoMes.length,
          em4Dias: enviadas.filter((l) => l.sent_at >= quatroDias).length,
          falhas: linhas.filter((l) => !l.ok && l.sent_at >= inicioDoMes).length,
          // "lida" também é entregue — e é a confirmação mais forte que existe.
          entregues: aceitasNoMes.filter(
            (l) => l.delivery_status === "delivered" || l.delivery_status === "read"
          ).length,
          naoEntregues: aceitasNoMes.filter((l) => l.delivery_status === "failed").length,
          // Aceita pela Meta e sem notícia desde então. Era o estado em que
          // TODAS viviam antes do webhook — e é o que escondeu os lembretes
          // que não chegaram.
          semConfirmacao: aceitasNoMes.filter((l) => !l.delivery_status).length,
        });
      });
    return () => {
      vivo = false;
    };
  }, []);

  return resumo;
}
