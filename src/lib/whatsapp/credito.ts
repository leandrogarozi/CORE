/**
 * Crédito de WhatsApp por pessoa (fase de teste).
 *
 * Todas as mensagens saem do número do FARO e cada uma custa. Por isso, quem NÃO é o dono só recebe
 * WhatsApp se (1) aceitou receber e (2) tem crédito. O dono (conta com `modo_dono`) não depende de crédito:
 * continua valendo só o teto em reais que ele já tinha. Existe ainda um teto GLOBAL de mensagens no mês,
 * para que um erro ou abuso nunca gere uma fatura inesperada.
 *
 * Saldo = mensagens concedidas (tabela `whatsapp_creditos`) − mensagens enviadas com sucesso (`whatsapp_sends`).
 * Quem concede por enquanto é o dono, por SQL; pagamento pelo app é um passo futuro.
 */

/** Quem ainda não tem linha em `whatsapp_creditos` começa com este crédito de boas-vindas (para poder testar logo). */
export const CREDITO_INICIAL = 20;
export const AVISO_DE_CREDITO_BAIXO = 5; // avisa a pessoa (uma vez) quando restarem tantas mensagens
export const TETO_GLOBAL_PADRAO = 2000; // mensagens por mês, somando todo mundo

/** concedidas: o que está na tabela (undefined = pessoa sem linha, vale o crédito inicial). */
export function saldoDe(concedidas: number | undefined | null, enviadas: number): number {
  return (concedidas ?? CREDITO_INICIAL) - enviadas;
}

export type MotivoDoBloqueio = "sem_aceite" | "sem_credito" | "teto_global";

export function decidirEnvio(p: {
  dono: boolean;
  aceitou: boolean;
  saldo: number; // concedidas − enviadas
  enviadasNoMesGeral: number;
  tetoGlobal: number;
}): { pode: true } | { pode: false; motivo: MotivoDoBloqueio } {
  if (p.enviadasNoMesGeral >= p.tetoGlobal) return { pode: false, motivo: "teto_global" };
  if (p.dono) return { pode: true };
  if (!p.aceitou) return { pode: false, motivo: "sem_aceite" };
  if (p.saldo <= 0) return { pode: false, motivo: "sem_credito" };
  return { pode: true };
}

export function tetoGlobalDoAmbiente(): number {
  const n = Number(process.env.WHATSAPP_TETO_GLOBAL_MES);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : TETO_GLOBAL_PADRAO;
}

export function textoDoBloqueio(m: MotivoDoBloqueio): string {
  if (m === "sem_aceite") return "Você ainda não aceitou receber mensagens no WhatsApp. Aceite em Configurações, Avisos e custos, Custo do WhatsApp.";
  if (m === "sem_credito") return "Seu crédito de mensagens do WhatsApp acabou. Fale com quem está construindo o FARO para ganhar mais.";
  return "O limite geral de mensagens do mês foi atingido. Tente novamente no mês que vem ou fale com quem está construindo o FARO.";
}
