import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * "Conectar com o Google": cada pessoa autoriza o FARO a criar eventos na agenda DELA (OAuth).
 * Pedimos desde já poder ler e escrever eventos e listar as agendas, para a mão dupla futura não exigir nova autorização.
 *
 * Variáveis na Vercel: GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET (cliente OAuth "Aplicativo da Web" no Google Cloud).
 */
export const ESCOPOS_DO_GOOGLE = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.calendarlist.readonly"];

export function credenciaisOAuth(): { id: string; segredo: string } | null {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const segredo = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  return id && segredo ? { id, segredo } : null;
}

/** Endereço de volta que precisa estar cadastrado no Google Cloud (um por domínio que o FARO usa). */
export function enderecoDeVolta(origem: string): string {
  return `${origem}/api/google/callback`;
}

export function enderecoDeAutorizacao(cred: { id: string }, origem: string, estado: string, email?: string): string {
  const p = new URLSearchParams({
    client_id: cred.id,
    redirect_uri: enderecoDeVolta(origem),
    response_type: "code",
    scope: ESCOPOS_DO_GOOGLE.join(" "),
    access_type: "offline", // devolve o refresh_token
    prompt: "consent select_account", // sem isso o Google só entrega o refresh_token na primeira vez
    include_granted_scopes: "true",
    state: estado,
  });
  if (email) p.set("login_hint", email);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

// ---- "state" assinado: amarra o retorno do Google à pessoa que clicou (evita conectar a conta errada) ----

function segredoDoEstado(): string {
  const s = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!s) throw new Error("GOOGLE_OAUTH_CLIENT_SECRET não configurada");
  return s;
}

export function gerarEstado(userId: string): string {
  const corpo = `${userId}.${Date.now()}.${randomBytes(8).toString("hex")}`;
  const assin = createHmac("sha256", segredoDoEstado()).update(corpo).digest("base64url");
  return `${Buffer.from(corpo).toString("base64url")}.${assin}`;
}

/** O id da pessoa, se o estado é nosso e tem menos de 15 minutos; senão null. */
export function lerEstado(estado: string | null): string | null {
  if (!estado) return null;
  const [corpoB64, assin] = estado.split(".");
  if (!corpoB64 || !assin) return null;
  const corpo = Buffer.from(corpoB64, "base64url").toString();
  const esperado = createHmac("sha256", segredoDoEstado()).update(corpo).digest("base64url");
  const a = Buffer.from(assin);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, quando] = corpo.split(".");
  if (!userId || Date.now() - Number(quando) > 15 * 60 * 1000) return null;
  return userId;
}

// ---- conversas com o Google ----

interface RespostaDeToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function pedirToken(corpo: Record<string, string>): Promise<RespostaDeToken & { ok: boolean }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(corpo),
  });
  const j = (await res.json().catch(() => ({}))) as RespostaDeToken;
  return { ...j, ok: res.ok && !!j.access_token };
}

export function trocarCodigo(cred: { id: string; segredo: string }, codigo: string, origem: string) {
  return pedirToken({ grant_type: "authorization_code", code: codigo, client_id: cred.id, client_secret: cred.segredo, redirect_uri: enderecoDeVolta(origem) });
}

/** Token de acesso novo a partir do refresh_token. `revogado` = a pessoa tirou a permissão (precisa reconectar). */
export async function renovarToken(cred: { id: string; segredo: string }, refresh: string): Promise<{ token: string; expiraEm: number } | { revogado: boolean; erro: string }> {
  const r = await pedirToken({ grant_type: "refresh_token", refresh_token: refresh, client_id: cred.id, client_secret: cred.segredo });
  if (r.ok && r.access_token) return { token: r.access_token, expiraEm: Math.floor(Date.now() / 1000) + (r.expires_in ?? 3600) };
  return { revogado: r.error === "invalid_grant", erro: r.error_description ?? r.error ?? "falha ao renovar" };
}

export async function revogarToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
}

export interface AgendaDoGoogle {
  id: string;
  nome: string;
  principal: boolean;
}

/** As agendas em que a pessoa pode criar eventos (a principal primeiro). */
export async function listarAgendas(token: string): Promise<AgendaDoGoogle[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const j = (await res.json().catch(() => ({}))) as { items?: { id: string; summary?: string; summaryOverride?: string; primary?: boolean }[] };
  return (j.items ?? [])
    .map((c) => ({ id: c.id, nome: c.summaryOverride || c.summary || c.id, principal: c.primary === true }))
    .sort((a, b) => Number(b.principal) - Number(a.principal) || a.nome.localeCompare(b.nome));
}
