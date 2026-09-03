const GRAPH_API_VERSION = "v21.0";

export function normalizeWhatsAppPhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

type WhatsAppSendResult = { ok: true } | { ok: false; error: string };

async function callWhatsAppApi(body: Record<string, unknown>): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp não configurado no servidor (faltam variáveis de ambiente)" };
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to: body.to, ...body }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const message = json?.error?.message || `Falha ao enviar (HTTP ${res.status})`;
    return { ok: false, error: message };
  }
  return { ok: true };
}

/** Manda o template "faro_teste" (categoria Serviços, aprovado pra conta real) — funciona sem sessão aberta. Só serve pra teste. */
export async function sendWhatsAppTestMessage(toRaw: string): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppPhone(toRaw);
  if (!to) return { ok: false, error: "Telefone inválido" };
  return callWhatsAppApi({
    to,
    type: "template",
    template: { name: "faro_teste", language: { code: "pt_BR" } },
  });
}

/**
 * Manda o template "lembrete_faro" (categoria Serviços, precisa existir e estar
 * aprovado na conta) — 1 variável de corpo com o texto do lembrete já formatado
 * (título + horário). Funciona fora da janela de 24h, é o usado pelo disparo
 * automático de lembretes.
 */
export async function sendWhatsAppReminderMessage(toRaw: string, reminderText: string): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppPhone(toRaw);
  if (!to) return { ok: false, error: "Telefone inválido" };
  return callWhatsAppApi({
    to,
    type: "template",
    template: {
      name: "lembrete_faro",
      language: { code: "pt_BR" },
      components: [{ type: "body", parameters: [{ type: "text", text: reminderText }] }],
    },
  });
}

/** Mensagem de texto livre — só entrega se o destinatário tiver falado com o número nas últimas 24h. */
export async function sendWhatsAppTextMessage(toRaw: string, text: string): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppPhone(toRaw);
  if (!to) return { ok: false, error: "Telefone inválido" };
  return callWhatsAppApi({
    to,
    type: "text",
    text: { body: text },
  });
}
