/**
 * A conversa do mascote: o que a IA recebe (instrução + resumo do dia) e os
 * limites da chamada. Puro, sem rede. A rota do servidor e os testes usam o mesmo.
 */

export interface MensagemDaConversa {
  role: "user" | "assistant";
  content: string;
}

export const LIMITE_DE_MENSAGENS = 12; // as últimas; conversa longa custa mais a cada resposta
export const LIMITE_DE_TEXTO = 2000; // por mensagem
export const LIMITE_DO_RESUMO = 8000; // caracteres do resumo do dia
export const MAX_TOKENS_DA_RESPOSTA = 1024; // resposta de chat é curta; também limita o custo de cada fala

export const INSTRUCAO_DO_FARO = `Você é o FARO, o mascote e assistente pessoal do Leandro Garozi dentro do app FARO (produtividade, rotina e aprendizados). Fale em português do Brasil, em tom próximo, direto e sem enrolação, como um parceiro de rotina. Respostas curtas (em geral até 6 linhas), sem títulos nem listas longas; use lista só quando ajudar.

Você recebe abaixo o RESUMO DO DIA dele (tarefas, atrasadas, lembretes, hábitos). Use isso para responder sobre a rotina, ajudar a priorizar e sugerir por onde começar. Regras:
- Não invente tarefa, horário ou compromisso que não esteja no resumo. Se não souber, diga que não sabe.
- Você ainda NÃO consegue criar, mudar nem apagar nada no app: se ele pedir uma ação (criar tarefa, lembrete), explique que por enquanto ele faz isso na tela e que você consegue ajudar a decidir o que fazer.
- Você não tem acesso a saúde, medicamentos, dieta, sono nem humor, e não dá orientação médica. Se perguntarem, diga que isso fica fora do que você enxerga hoje.
- O Leandro prefere saídas concisas, estruturadas, com opções claras para escolher.`;

/** Mantém só mensagens válidas, as últimas N, cada uma no tamanho máximo. A primeira é sempre do usuário. */
export function prepararMensagens(entrada: unknown): MensagemDaConversa[] {
  if (!Array.isArray(entrada)) return [];
  const limpas: MensagemDaConversa[] = [];
  for (const m of entrada) {
    if (!m || typeof m !== "object") continue;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const texto = content.trim().slice(0, LIMITE_DE_TEXTO);
    if (!texto) continue;
    limpas.push({ role, content: texto });
  }
  let ultimas = limpas.slice(-LIMITE_DE_MENSAGENS);
  while (ultimas.length && ultimas[0].role !== "user") ultimas = ultimas.slice(1);
  // A API junta mensagens seguidas do mesmo papel, mas a última precisa ser do usuário.
  if (!ultimas.length || ultimas[ultimas.length - 1].role !== "user") return [];
  return ultimas;
}

export function sistemaDaConversa(resumo: string): string {
  const corte = resumo.slice(0, LIMITE_DO_RESUMO);
  return `${INSTRUCAO_DO_FARO}\n\n=== RESUMO DO DIA ===\n${corte}`;
}
