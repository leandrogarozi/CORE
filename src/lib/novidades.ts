/**
 * Novidades do FARO: a lista do que mudou, em linguagem simples e curta.
 *
 * COMO FUNCIONA
 * - Toda atualização que a pessoa percebe ganha uma entrada AQUI (a mais nova em cima).
 * - Quando a pessoa abre o app, POST /api/novidades põe cada entrada que ela ainda não recebeu na caixa de Avisos
 *   ("O FARO foi atualizado"). Quem criou a conta depois da data da entrada não recebe (não é novidade para ela).
 * - O FARO conversacional lê as entradas recentes (resumo do dia) e sabe explicar "o que mudou?".
 * - `feedbackIds`: ids de feedbacks que esta atualização resolveu. Quem mandou esses feedbacks já recebe o aviso de
 *   "seu feedback foi resolvido", então NÃO recebe este aviso geral (os outros recebem).
 *
 * REGRA DE TRABALHO: ao publicar mudança visível, acrescentar a entrada junto (id único, texto de 1 a 3 frases).
 */
export interface Novidade {
  /** Único e estável: vira a chave de "já entregue" (tipo `novidade:<id>` em faro_avisos). */
  id: string;
  /** AAAA-MM-DD. */
  data: string;
  titulo: string;
  corpo: string;
  feedbackIds?: string[];
}

export const NOVIDADES: Novidade[] = [
  {
    id: "2026-11-14-historico-de-conversas",
    data: "2026-11-14",
    titulo: "Histórico das conversas com o FARO",
    corpo:
      "Ao lado do nome FARO, na janela de conversa, há um relógio: ele mostra as últimas conversas (por dia e hora), com o que você pediu e o que o FARO respondeu. Ficam guardadas neste aparelho por 14 dias.",
  },
  {
    id: "2026-11-14-respostas-organizadas",
    data: "2026-11-14",
    titulo: "O FARO ficou mais fácil de ler",
    corpo:
      "As respostas do FARO sobre desempenho agora vêm em blocos curtos, com títulos em negrito e cada comparação no formato “com X, sem Y, resultado” (ex.: com leitura 2,8 tarefas por dia, sem leitura 1,9). Ele também destaca os pontos de atenção e fecha com uma sugestão.",
  },
  {
    id: "2026-11-14-conversa-produtividade",
    data: "2026-11-14",
    titulo: "O FARO foi atualizado",
    corpo:
      "Na conversa com o FARO: agora ele enxerga os últimos 14 dias inteiros e cruza leitura, gratidão, exercício e estudo com suas tarefas, humor e sono (neste mês, em 30 dias ou em 3 meses). Pergunte “como está meu desempenho?”. A janela também ganhou um botão de ampliar, no topo, para ler respostas longas.",
  },
];

/** Quantos dias uma novidade continua sendo entregue e contada ao FARO. */
export const DIAS_DE_NOVIDADE = 30;

const diasDesde = (iso: string, hoje: string) => Math.round((Date.parse(hoje) - Date.parse(iso)) / 86400000);

/** O que o FARO conversacional sabe de novo (para responder "o que mudou?" e para explicar). */
export function novidadesDoFaro(hoje: string): string {
  const recentes = NOVIDADES.filter((n) => diasDesde(n.data, hoje) <= DIAS_DE_NOVIDADE).slice(0, 6);
  if (!recentes.length) return "";
  return ["\nNOVIDADES DO FARO (o que mudou nos últimos 30 dias; use se ele perguntar o que mudou):", ...recentes.map((n) => `- ${n.data.split("-").reverse().slice(0, 2).join("/")}: ${n.corpo}`)].join("\n");
}
