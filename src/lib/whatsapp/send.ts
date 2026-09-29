const GRAPH_API_VERSION = "v21.0";

/**
 * Só os dígitos, mais o código do país. O campo da tela aceita o número como o
 * brasileiro escreve ("27 98144-7230"), mas a Meta exige o formato
 * internacional — sem o 55 na frente ela recusa o número.
 *
 * A regra é pelo TAMANHO, não por "começa com 55": 10 ou 11 dígitos é DDD +
 * número (com ou sem o nono) e ganha o 55. Checar o prefixo quebraria o DDD 55
 * (Rio Grande do Sul), onde "55981447230" é um número que também precisa do
 * código do país.
 *
 * LIMITAÇÃO ASSUMIDA: isto trata todo número de 10 ou 11 dígitos como
 * brasileiro. Um telefone americano escrito por inteiro ("14155552671") também
 * tem 11 dígitos e sairia daqui como "5514155552671" — errado. O FARO é um app
 * brasileiro de um usuário só, então a troca vale a pena; se um dia atender
 * gente de fora, o campo vai ter que perguntar o país em vez de adivinhar.
 */
export function normalizeWhatsAppPhone(raw: string): string {
  const digitos = raw.replace(/[^\d]/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
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
    const err = json?.error;
    // O código do Meta é o que diz o que fazer: 190 = token expirado/inválido,
    // 132001 = template não existe ou não foi aprovado. Sem ele, "Authentication
    // Error" sozinho não diz nada pra quem está olhando a tela.
    const message = err?.message
      ? `${err.message}${err.code ? ` (código ${err.code}${err.error_subcode ? `/${err.error_subcode}` : ""})` : ""}`
      : `Falha ao enviar (HTTP ${res.status})`;
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
 * A Meta recusa parâmetro de template que contenha quebra de linha, tabulação
 * ou 4+ espaços seguidos. O texto do lembrete nasce do título que o Leandro
 * digitou — e título colado de outro lugar traz quebra de linha junto sem
 * ninguém perceber. Limpar aqui é mais barato que descobrir pelo lembrete que
 * não chegou.
 *
 * Se sobrar vazio (título só de espaços), manda uma palavra em vez de string
 * vazia: parâmetro vazio a Meta também recusa, e um lembrete genérico chegando
 * é melhor que nenhum.
 */
function limparParametro(texto: string): string {
  return texto.replace(/\s+/g, " ").trim() || "Lembrete";
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
      components: [{ type: "body", parameters: [{ type: "text", text: limparParametro(reminderText) }] }],
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
