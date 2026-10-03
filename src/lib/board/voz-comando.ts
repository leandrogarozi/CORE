/**
 * Tira da frase falada a "ordem" dada ao FARO, deixando só o que importa.
 *
 * Quem fala costuma dizer "Faro, cria pra mim comprar pilha" — e o título da
 * tarefa tem que ser "Comprar pilha", não a frase inteira. Só mexe no COMEÇO da
 * frase, e com cuidado: "Criar um site novo" é o título de uma tarefa, não uma
 * ordem. Por isso o verbo (cria, adiciona, anota...) só é tirado quando a frase
 * foi dirigida ao FARO ("Faro, ...") ou quando a ordem é explícita ("cria pra
 * mim", "adiciona uma tarefa").
 *
 * Devolve "" quando sobra só a ordem ("Faro, cria"): não há o que criar, e uma
 * tarefa chamada "Cria" seria lixo. O chamador não cria nada nesse caso.
 *
 * Isto é regra simples, não entendimento: "cria um lembrete amanhã às 10" vira
 * uma tarefa com essas palavras. Entender data, hora e tipo é trabalho da IA
 * (ver BRIEFING, passo da captura por voz).
 */
const VERBO = "(?:cria(?:r)?|adiciona(?:r)?|anota(?:r)?|coloca(?:r)?|registra(?:r)?)";
const SO_VERBO = new RegExp(`^${VERBO}$`, "i");
const VERBO_E_RESTO_DIRIGIDO = new RegExp(
  `^${VERBO}(?:\\s+(?:pra|para)\\s+mim)?(?:\\s+(?:uma|a)\\s+tarefa)?(?:\\s+(?:de|para|pra|que))?[,:\\s]+`,
  "i"
);
const VERBO_EXPLICITO = new RegExp(
  `^${VERBO}\\s+(?:(?:pra|para)\\s+mim(?:\\s+(?:uma|a)\\s+tarefa)?|(?:uma|a)\\s+tarefa)(?:\\s+(?:de|para|pra|que))?[,:\\s]+`,
  "i"
);

export function limparComandoDeVoz(frase: string): string {
  let t = frase.trim();
  const saudacao = /^(?:(?:oi|ei|ok|olá)[,.\s]+)?faro[,.!:\s]*/i;
  const dirigida = saudacao.test(t);
  if (dirigida) t = t.replace(saudacao, "").trim();

  if (dirigida) {
    if (SO_VERBO.test(t)) return "";
    t = t.replace(VERBO_E_RESTO_DIRIGIDO, "");
  } else {
    t = t.replace(VERBO_EXPLICITO, "");
  }
  t = t.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
