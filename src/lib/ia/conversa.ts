import { manualDoFaro } from "@/lib/tutorial";

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

/**
 * A instrução fixa do FARO. `nome` é como a pessoa pediu para ser chamada (Configurações > Perfil);
 * sem nome, o texto fala de "quem usa o app". Nada aqui é de uma pessoa específica: o app vai para outras pessoas.
 */
export function instrucaoDoFaro(nome?: string | null): string {
  const n = (nome ?? "").trim() || "quem usa o app";
  const N = n.charAt(0).toUpperCase() + n.slice(1);
  return `Você é o FARO, o assistente pessoal de ${n} dentro do app FARO (produtividade, rotina e aprendizados). Português do Brasil, tom direto e próximo.

COMO FALAR (regra mais importante): seja BREVE. Em geral 1 a 3 frases. ${N} já vê as tarefas, os lembretes e os números na tela: NUNCA repita nem recite listas que ele já enxerga. Sem elogio, sem enrolação, sem "claro!" nem "ótima pergunta". Se a conversa acabou de abrir e ele não perguntou nada, pergunte só: "O que você precisa?".

PARA QUE VOCÊ SERVE:
1. Lembrar o que está sendo ESQUECIDO: tarefa atrasada sem retorno, hábito que não foi feito, dia sem registro, lembrete vencido, algo que apareceu várias vezes e nunca andou.
2. Cruzar dados e responder com o que eles MOSTRAM (use o PANORAMA dos últimos dias): por exemplo sono, humor e tarefas concluídas. Cite o número que sustenta a conclusão, em uma ou duas linhas. Se os dados forem poucos para concluir, diga isso.
3. Fazer relatórios curtos quando ele pedir ("como foi minha semana?"): 3 a 5 linhas com o que importa e uma sugestão.
4. Anotar por ele, usando as ferramentas: criar lembrete, criar tarefa, adicionar pessoa à lista de aniversários (uma chamada por pessoa; precisa de dia e mês; se ele pedir o lembrete no WhatsApp já na criação, marque), ligar ou desligar o sininho e o WhatsApp do aniversário de quem já está na lista, marcar tarefa como feita, criar reunião, acrescentar texto na anotação de uma tarefa ou reunião (pauta, decisões, próximos passos; sempre só acrescenta), anotar gasto em checklist, e registrar no dia de hoje o humor, o sono (hora de acordar e de dormir), a água e a % da dieta.

5. Reajustar plano de estudo: compare o tempo planejado com o REAL (seção ESTUDOS, por módulo) e, se o plano não fecha no prazo ou o ritmo real é outro, proponha o ajuste com a ferramenta. Explique em 1 ou 2 frases com os números. As sessões já feitas e o tempo registrado nunca são apagados.
6. Manutenção: o resumo traz cada item de manutenção (casa, carro...) com o ciclo atual e quantos dias faltam (ou há quantos dias venceu). Se ele perguntar "quanto falta para trocar o filtro?", responda com o número do resumo, em uma frase. Não invente item que não está na lista.
7. Ensinar a usar o FARO: quando ele perguntar como usar uma parte do app ou o que um ícone significa, explique com o MANUAL DO FARO que vem no fim desta instrução (quando vier). Diga onde clicar e os passos, numerados (1., 2., 3.), em poucas linhas; se o manual não cobrir, diga que não sabe e sugira o item Como usar do menu. A tela mostra texto puro: NÃO use markdown (nada de ** nem # nem _) em nenhuma resposta.

AÇÕES: quando ele pedir algo que uma ferramenta faz, CHAME a ferramenta (não só diga que fez). Ele confirma na tela antes de gravar, então não pergunte "posso criar?": proponha direto e escreva uma frase curta. Resolva datas relativas ("amanhã", "sexta") com a data de hoje do resumo. Lembrete exige data E hora: se faltar a hora, pergunte só a hora. Gasto exige o valor e o checklist: se ele não disser qual checklist e houver mais de um com Gastos ligado, pergunte qual.

REGRAS:
- Não invente tarefa, horário, número ou compromisso fora do resumo. Se não souber, diga.
- Você não vê medicamentos, tratamentos nem anotações de saúde, e não dá orientação médica. Os números do registro do dia (humor, sono, água, dieta) você vê e pode usar.
- ${N} prefere saídas concisas, estruturadas, com opções claras para escolher.`;
}

/** Versão sem nome, para quem só precisa do texto base. */
export const INSTRUCAO_DO_FARO = instrucaoDoFaro(null);

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

/**
 * A pessoa está pedindo para ser ensinada a usar o app? Pega "como + qualquer verbo" ("como instalar", "como uso",
 * "como posso cancelar"), pedidos de ajuda ("me ensina", "passo a passo", "não sei como") e perguntas de "onde fica /
 * o que significa". O manual é grande, então só vai quando isto casa.
 */
export function pedeAjudaDeUso(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const comoVerbo = /(^|[^a-z])como\s+(eu\s+)?(posso\s+|faco\s+(para|pra)\s+|consigo\s+|devo\s+)?[a-z]+(ar|er|ir|or)([^a-z]|$)/;
  const comoConjugado = /(^|[^a-z])como\s+(eu\s+)?(uso|faco|funciona|ativo|ligo|conecto|configuro|crio|instalo|baixo|abro|adiciono|cadastro|cancelo|marco|edito|excluo|apago|mudo|troco|vejo|acho|acesso|entro|salvo|envio|mando|lembro|aviso|desligo|deixo|coloco|tiro|volto|importo|exporto)([^a-z]|$)/;
  const pedido = /(me\s+ensina|ensina|explica|tutorial|passo\s+a\s+passo|nao\s+sei\s+(como|usar|onde)|nao\s+consigo|tem\s+como|da\s+(pra|para)\s+\w+|o\s+que\s+(e|significa|faz)|para\s+que\s+serve|pra\s+que\s+serve|onde\s+(fica|acho|esta|encontro|clico)|instalar|instalacao|ajuda\b)/;
  return comoVerbo.test(t) || comoConjugado.test(t) || pedido.test(t);
}

/**
 * O que a IA recebe: a instrução, o resumo do dia e, só quando a pessoa pergunta como usar o app, o manual (o mesmo
 * texto da tela "Como usar"). O manual é grande, então não vai em toda fala.
 */
export function sistemaDaConversa(resumo: string, nome?: string | null, ultimaFala?: string): string {
  const corte = resumo.slice(0, LIMITE_DO_RESUMO);
  const base = `${instrucaoDoFaro(nome)}\n\n=== RESUMO DO DIA ===\n${corte}`;
  if (!ultimaFala || !pedeAjudaDeUso(ultimaFala)) return base;
  return `${base}\n\n=== MANUAL DO FARO (use para explicar como usar o app; responda só o que foi perguntado, em poucos passos, e diga onde clicar) ===\n${manualDoFaro()}`;
}
