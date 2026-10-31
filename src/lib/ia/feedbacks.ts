/**
 * Feedbacks recebidos (só o dono) no assistente: o resumo que a IA lê e a busca de qual feedback a fala se refere.
 * Puro, sem rede: a tela busca a lista em /api/feedback e passa para cá.
 */
export interface FeedbackDoDono {
  id: string;
  tipo: string;
  texto: string;
  email: string | null;
  lido_em: string | null;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const ROTULO: Record<string, string> = { problema: "Problema", ideia: "Ideia", duvida: "Dúvida", elogio: "Elogio", credito: "Crédito de WhatsApp" };

/** A seção do resumo: só os feedbacks A RESOLVER, numerados na ordem em que aparecem na tela (1 = o primeiro da lista). */
export function resumoDeFeedbacks(lista: FeedbackDoDono[]): string {
  const abertos = lista.filter((f) => !f.lido_em);
  if (!abertos.length) return "";
  const linhas = [`\nFEEDBACKS A RESOLVER (${abertos.length}; só o dono vê; "numero" é a posição nesta lista):`];
  abertos.slice(0, 15).forEach((f, i) => {
    const texto = f.texto.replace(/\s+/g, " ").trim();
    linhas.push(`${i + 1}. [${ROTULO[f.tipo] ?? f.tipo}] ${f.email ? f.email + ": " : ""}${texto.length > 160 ? texto.slice(0, 157) + "…" : texto}`);
  });
  if (abertos.length > 15) linhas.push(`(mais ${abertos.length - 15} não listados)`);
  return linhas.join("\n");
}

/**
 * Acha o feedback pelo trecho do texto (sem ligar para acento ou maiúscula) ou, se não houver trecho, pela posição na lista de
 * "a resolver". Nunca adivinha: mais de um parecido ou nenhum devolve o erro.
 */
export function acharFeedback(
  lista: FeedbackDoDono[],
  alvo: { numero: number | null; trecho: string | null },
  jaResolvidos: boolean
): { feedback: FeedbackDoDono } | { erro: string } {
  const universo = lista.filter((f) => (jaResolvidos ? !!f.lido_em : !f.lido_em));
  if (alvo.trecho) {
    const t = semAcento(alvo.trecho);
    const achados = universo.filter((f) => semAcento(f.texto).includes(t));
    if (achados.length === 1) return { feedback: achados[0] };
    if (achados.length > 1) {
      // O número, se veio e bate com um dos achados, desempata.
      const porNumero = alvo.numero && !jaResolvidos ? universo[alvo.numero - 1] : null;
      if (porNumero && achados.includes(porNumero)) return { feedback: porNumero };
      return { erro: `Achei mais de um feedback com "${alvo.trecho}". Diga o número da lista.` };
    }
  }
  if (alvo.numero && !jaResolvidos) {
    const f = universo[alvo.numero - 1];
    if (f) return { feedback: f };
  }
  return { erro: `Não achei esse feedback${jaResolvidos ? " entre os resolvidos" : " entre os a resolver"}. Abra "Feedbacks recebidos" para conferir.` };
}
