import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Peças puras do webhook de status da Meta — sem Next, sem banco, pra poderem
 * ser testadas isoladas. A rota só cola isto com o Supabase.
 */

export type StatusEntrega = "sent" | "delivered" | "read" | "failed";

/**
 * Ordem em que o status avança. Serve pra uma coisa só: o webhook da Meta
 * **chega fora de ordem**. Sem isto, um `sent` atrasado apagaria um `delivered`
 * que já tinha chegado, e o painel passaria a mentir pra baixo.
 *
 * `failed` fica no topo porque, no fluxo da Meta, ele vem NO LUGAR do
 * `delivered` — nunca depois dele. Uma falha é o que o Leandro precisa ver;
 * deixá-la ser encoberta é justamente o problema que este webhook existe pra
 * resolver.
 */
export const ORDEM: Record<StatusEntrega, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

/** Os status que o novo pode substituir — tudo que está abaixo dele na ordem. */
export function statusesAbaixoDe(novo: StatusEntrega): StatusEntrega[] {
  const alvo = ORDEM[novo];
  return (Object.keys(ORDEM) as StatusEntrega[]).filter((s) => ORDEM[s] < alvo);
}

export function ehStatusConhecido(s: string): s is StatusEntrega {
  return s === "sent" || s === "delivered" || s === "read" || s === "failed";
}

/**
 * Confere o `x-hub-signature-256`: HMAC-SHA256 do corpo CRU com o App Secret.
 *
 * Esta rota é pública — sem assinatura, qualquer um na internet poderia POSTar
 * "entregue" pra qualquer message_id e o painel acreditaria. Por isso a função
 * falha fechada: sem segredo ou sem cabeçalho, é não.
 *
 * A comparação é de tempo constante porque comparar hash com `===` vaza, pelo
 * tempo de resposta, quantos bytes iniciais o atacante acertou.
 */
export function assinaturaConfere(corpoCru: string, cabecalho: string | null, segredo: string | undefined): boolean {
  if (!segredo || !cabecalho) return false;
  if (!cabecalho.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex");
  const recebido = cabecalho.slice("sha256=".length);
  // timingSafeEqual exige o mesmo tamanho; tamanhos diferentes já são "não".
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido, "utf8"), Buffer.from(esperado, "utf8"));
}

export type StatusRecebido = {
  messageId: string;
  status: StatusEntrega;
  em: string;
  erro: string | null;
};

type CorpoWebhook = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{
          id?: unknown;
          status?: unknown;
          timestamp?: unknown;
          errors?: Array<{ code?: unknown; title?: unknown; message?: unknown }>;
        }>;
      };
    }>;
  }>;
};

/**
 * Tira do corpo os status que interessam.
 *
 * Nada aqui confia no formato: é corpo de internet, e um `entry` sem `changes`
 * ou um status sem `id` não pode derrubar a rota — se derrubasse, a Meta
 * ficaria reenviando o mesmo lote pra sempre.
 */
export function statusesDoCorpo(corpo: unknown): StatusRecebido[] {
  const saida: StatusRecebido[] = [];
  const raiz = (corpo ?? {}) as CorpoWebhook;
  for (const entrada of raiz.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      for (const st of mudanca.value?.statuses ?? []) {
        const id = typeof st.id === "string" ? st.id : null;
        const status = typeof st.status === "string" ? st.status : null;
        if (!id || !status || !ehStatusConhecido(status)) continue;

        // A Meta manda segundos desde a época, em texto. Se vier qualquer outra
        // coisa, a hora do recebimento é melhor que uma data inventada.
        const seg = Number(st.timestamp);
        const em = Number.isFinite(seg) && seg > 0 ? new Date(seg * 1000).toISOString() : new Date().toISOString();

        const primeiro = st.errors?.[0];
        const erro = primeiro
          ? [primeiro.code, primeiro.title, primeiro.message].filter((p) => typeof p === "string" || typeof p === "number").join(" — ") || null
          : null;

        saida.push({ messageId: id, status, em, erro });
      }
    }
  }
  return saida;
}
