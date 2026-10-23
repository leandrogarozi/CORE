/**
 * Conta do gasto com a IA (API da Anthropic): tokens viram dólar e dólar vira
 * real. Puro, sem rede: é o que deixa conferir a conta em teste, e o teto de
 * gasto do servidor usa exatamente estas funções.
 *
 * O modelo mora numa constante só para trocar fácil e comparar custo e
 * qualidade no painel depois (decisão do Leandro: Sonnet 5.5, por custo).
 */

export const MODELO_DA_IA = "claude-sonnet-5-5";

/** Dólares por MILHÃO de tokens (tabela de 06/10/2026). */
export const PRECOS_POR_MILHAO: Record<
  string,
  { entrada: number; saida: number; cacheLeitura: number; cacheEscrita: number }
> = {
  "claude-sonnet-5-5": { entrada: 2, saida: 10, cacheLeitura: 0.2, cacheEscrita: 2.5 },
};

export interface UsoDeTokens {
  entrada: number; // tokens de entrada sem cache
  saida: number;
  cacheLeitura: number;
  cacheEscrita: number;
}

/** Cotação de reserva quando a pessoa ainda não ajustou o dólar nas Configurações. */
export const DOLAR_PADRAO = 5.1;
export const TETO_PADRAO_BRL = 20;
/** Quem não é dono usa a chave do dono: o teto que a pessoa escolhe nunca passa deste valor, e o dólar nunca vale menos que o padrão. */
export const TETO_MAXIMO_DE_TESTADOR_BRL = 10;

export function limitesDaIa(config: { ia_monthly_cap_brl?: unknown; whatsapp_usd_brl?: unknown; feature_flags?: unknown } | null): {
  teto: number;
  dolar: number;
  dono: boolean;
} {
  const flags = (config?.feature_flags ?? {}) as Record<string, unknown>;
  const dono = flags.modo_dono === true;
  const capDaPessoa = Number(config?.ia_monthly_cap_brl ?? TETO_PADRAO_BRL);
  const dolarDaPessoa = Number(config?.whatsapp_usd_brl ?? DOLAR_PADRAO);
  return {
    dono,
    teto: dono ? capDaPessoa : Math.min(capDaPessoa, TETO_MAXIMO_DE_TESTADOR_BRL),
    dolar: dono ? dolarDaPessoa : Math.max(dolarDaPessoa, DOLAR_PADRAO),
  };
}

export function custoEmUsd(modelo: string, uso: UsoDeTokens): number {
  // Modelo que não conheço: cobra pelo preço do modelo atual em vez de dizer
  // que saiu de graça. Errar para cima protege o teto.
  const p = PRECOS_POR_MILHAO[modelo] ?? PRECOS_POR_MILHAO[MODELO_DA_IA];
  return (
    (uso.entrada * p.entrada + uso.saida * p.saida + uso.cacheLeitura * p.cacheLeitura + uso.cacheEscrita * p.cacheEscrita) /
    1_000_000
  );
}

/** Início do mês corrente no fuso de Brasília (sem horário de verão desde 2019). */
export function inicioDoMesISO(agora: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .format(agora)
    .split("-");
  return `${partes[0]}-${partes[1]}-01T00:00:00-03:00`;
}

/** "2026-10" no horário de Brasília: chave para agrupar os meses no painel. */
export function chaveDoMes(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .format(new Date(iso))
    .split("-");
  return `${partes[0]}-${partes[1]}`;
}
