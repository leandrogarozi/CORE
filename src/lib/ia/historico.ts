/**
 * Histórico das conversas com o FARO: guardado só neste aparelho (localStorage), para rever o que foi pedido e respondido.
 * Cada conversa é uma lista de falas em texto (os cartões de ação viram uma linha com o desfecho). Mantém as últimas
 * 14 dias e no máximo 40 conversas. Nada vai para o servidor.
 */
export interface FalaSalva {
  role: "user" | "assistant";
  content: string;
}
export interface ConversaSalva {
  id: string;
  /** ms desde 1970 do começo da conversa. */
  inicio: number;
  /** ms desde 1970 da última fala. */
  fim: number;
  falas: FalaSalva[];
}

const CHAVE = "faro-historico-v1";
const DIAS = 14;
const MAX_CONVERSAS = 40;

export function lerConversas(): ConversaSalva[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as ConversaSalva[];
    if (!Array.isArray(bruto)) return [];
    const corte = Date.now() - DIAS * 86400000;
    return bruto.filter((c) => c && Array.isArray(c.falas) && c.falas.length && c.fim >= corte).sort((a, b) => b.fim - a.fim);
  } catch {
    return [];
  }
}

/** Grava (ou atualiza) uma conversa. Ignora conversa sem nenhuma fala completa. */
export function salvarConversa(c: ConversaSalva): void {
  const falas = c.falas.filter((f) => f.content.trim());
  if (!falas.length) return;
  try {
    const outras = lerConversas().filter((x) => x.id !== c.id);
    const todas = [{ ...c, falas }, ...outras].sort((a, b) => b.fim - a.fim).slice(0, MAX_CONVERSAS);
    localStorage.setItem(CHAVE, JSON.stringify(todas));
  } catch {
    /* sem espaço ou bloqueado: o histórico é só uma comodidade */
  }
}

export function limparHistorico(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}

/** "Hoje", "Ontem" ou "12/11". */
export function rotuloDoDia(ms: number, agora = Date.now()): string {
  const d = new Date(ms);
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((dia(new Date(agora)) - dia(d)) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const horaDe = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
