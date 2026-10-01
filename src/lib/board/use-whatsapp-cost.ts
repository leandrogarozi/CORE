"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MONTH_NAMES_FULL } from "@/lib/date-utils";

/**
 * O resumo de envios e gasto do WhatsApp, do mês corrente e dos anteriores.
 *
 * Mora aqui, e não dentro da tela, porque o número aparece em DOIS lugares —
 * Configurações e Dashboard. Duas cópias da mesma conta é como elas divergem:
 * bastaria alguém corrigir o limite do mês num lado e esquecer do outro, e o
 * app passaria a dizer duas verdades sobre quanto o Leandro gastou.
 */
export type ResumoDoMes = {
  /** "2026-10" — chave de ordenação e de comparação. */
  chave: string;
  /** "Mês atual", "setembro", "dezembro de 2025" — o que aparece na tela. */
  rotulo: string;
  /** O mês corrente ganha "até o momento" na tela: ele ainda não fechou. */
  ehAtual: boolean;
  enviadas: number;
  entregues: number;
  naoEntregues: number;
  semConfirmacao: number;
  falhas: number;
};

export type ResumoDoZap = {
  // Campos do mês corrente, no primeiro nível: é o número que as duas telas
  // mostram em destaque, e empurrá-lo pra dentro de um objeto só deixaria todo
  // mundo escrevendo `resumo.mes.noMes`.
  noMes: number;
  em4Dias: number;
  falhas: number;
  entregues: number;
  naoEntregues: number;
  semConfirmacao: number;
  /** O mês anterior, pra comparação direta. `null` no primeiro mês de uso. */
  anterior: ResumoDoMes | null;
  /** Do mais recente pro mais antigo, incluindo o mês corrente. */
  meses: ResumoDoMes[];
};

/**
 * Como o mês se chama na tela.
 *
 * O corrente é "Mês atual" porque é assim que ele lê a linha — o nome do mês
 * ali exigiria lembrar em que mês estamos pra saber se aquele é o de agora.
 * Os outros vão por extenso, e o ano só entra quando NÃO é o ano corrente:
 * "setembro" e "setembro de 2025" são meses diferentes, e escrever o ano em
 * todos só polui a lista do ano em que ele está.
 */
function rotuloDoMes(chave: string, chaveAtual: string, anoAtual: number): string {
  if (chave === chaveAtual) return "Mês atual";
  const [ano, mes] = chave.split("-");
  const nome = MONTH_NAMES_FULL[Number(mes) - 1];
  return Number(ano) === anoAtual ? nome : `${nome} de ${ano}`;
}

export function useWhatsAppCost(): ResumoDoZap | null {
  const [resumo, setResumo] = useState<ResumoDoZap | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const agora = new Date();
    const quatroDias = new Date(agora.getTime() - 4 * 24 * 3600 * 1000).toISOString();
    // Treze meses: doze cheios pra trás mais o corrente. Com o teto de R$ 20 o
    // volume máximo é da ordem de 500 mensagens por mês, então isso cabe numa
    // consulta sem paginar — e é o que permite o relatório que ele pediu, em vez
    // de só "este mês".
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 12, 1);

    // A chave do mês sai do horário LOCAL de quem está olhando: a fatura da
    // Meta fecha por mês de calendário, e montar isso em UTC jogaria as três
    // primeiras horas de todo dia 1º pro mês anterior.
    const chaveLocal = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const chaveAtual = chaveLocal(agora);
    const chaveAnterior = chaveLocal(new Date(agora.getFullYear(), agora.getMonth() - 1, 1));

    let vivo = true;
    supabase
      .from("whatsapp_sends")
      .select("sent_at, ok, delivery_status")
      .gte("sent_at", inicio.toISOString())
      .order("sent_at", { ascending: false })
      .then(({ data }) => {
        if (!vivo) return;
        const linhas = data ?? [];

        const porMes = new Map<string, ResumoDoMes>();
        for (const l of linhas) {
          // A data vem em UTC; a chave tem que sair do fuso de quem olha.
          const chave = chaveLocal(new Date(l.sent_at));
          let m = porMes.get(chave);
          if (!m) {
            m = {
              chave,
              rotulo: rotuloDoMes(chave, chaveAtual, agora.getFullYear()),
              ehAtual: chave === chaveAtual,
              enviadas: 0,
              entregues: 0,
              naoEntregues: 0,
              semConfirmacao: 0,
              falhas: 0,
            };
            porMes.set(chave, m);
          }
          // Só o que a Meta aceitou custa. Tentativa que falhou não entra na
          // conta de gasto, mas entra no contador de falhas, que é outro
          // assunto — e é o que mostra que alguma coisa está quebrada.
          if (!l.ok) {
            m.falhas++;
            continue;
          }
          m.enviadas++;
          // "lida" também é entregue — e é a confirmação mais forte que existe.
          if (l.delivery_status === "delivered" || l.delivery_status === "read") m.entregues++;
          else if (l.delivery_status === "failed") m.naoEntregues++;
          // Aceita pela Meta e sem notícia desde então. Era o estado em que
          // TODAS viviam antes do webhook — e é o que escondeu os lembretes
          // que não chegaram.
          else m.semConfirmacao++;
        }

        const meses = [...porMes.values()].sort((a, b) => b.chave.localeCompare(a.chave));
        const atual = porMes.get(chaveAtual);

        setResumo({
          noMes: atual?.enviadas ?? 0,
          falhas: atual?.falhas ?? 0,
          entregues: atual?.entregues ?? 0,
          naoEntregues: atual?.naoEntregues ?? 0,
          semConfirmacao: atual?.semConfirmacao ?? 0,
          em4Dias: linhas.filter((l) => l.ok && l.sent_at >= quatroDias).length,
          anterior: porMes.get(chaveAnterior) ?? null,
          meses,
        });
      });
    return () => {
      vivo = false;
    };
  }, []);

  return resumo;
}
