// src/lib/whatsapp/webhook.ts
import { createHmac, timingSafeEqual } from "node:crypto";
var ORDEM = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4
};
function statusesAbaixoDe(novo) {
  const alvo = ORDEM[novo];
  return Object.keys(ORDEM).filter((s) => ORDEM[s] < alvo);
}
function ehStatusConhecido(s) {
  return s === "sent" || s === "delivered" || s === "read" || s === "failed";
}
function assinaturaConfere(corpoCru, cabecalho, segredo) {
  if (!segredo || !cabecalho) return false;
  if (!cabecalho.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex");
  const recebido = cabecalho.slice("sha256=".length);
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido, "utf8"), Buffer.from(esperado, "utf8"));
}
function statusesDoCorpo(corpo) {
  const saida = [];
  const raiz = corpo ?? {};
  for (const entrada of raiz.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      for (const st of mudanca.value?.statuses ?? []) {
        const id = typeof st.id === "string" ? st.id : null;
        const status = typeof st.status === "string" ? st.status : null;
        if (!id || !status || !ehStatusConhecido(status)) continue;
        const seg = Number(st.timestamp);
        const em = Number.isFinite(seg) && seg > 0 ? new Date(seg * 1e3).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
        const primeiro = st.errors?.[0];
        const erro = primeiro ? [primeiro.code, primeiro.title, primeiro.message].filter((p) => typeof p === "string" || typeof p === "number").join(" \u2014 ") || null : null;
        saida.push({ messageId: id, status, em, erro });
      }
    }
  }
  return saida;
}
export {
  ORDEM,
  assinaturaConfere,
  ehStatusConhecido,
  statusesAbaixoDe,
  statusesDoCorpo
};
