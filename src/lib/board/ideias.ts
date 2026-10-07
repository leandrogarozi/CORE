/**
 * Título provisório de uma ideia ditada. O FARO ainda não conversa com a IA, então
 * o título sai do começo da fala: a primeira frase, até umas 9 palavras, com a
 * primeira letra maiúscula. A IA refina isso depois (`titleAuto` marca os títulos
 * que ainda são provisórios).
 */
export function tituloDaIdeia(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (!limpo) return "Ideia sem título";
  const primeiraFrase = limpo.split(/(?<=[.!?])\s|\n/)[0];
  const palavras = primeiraFrase.replace(/[.!?]+$/, "").split(" ");
  const MAX = 9;
  let titulo = palavras.slice(0, MAX).join(" ");
  const cortou = palavras.length > MAX;
  if (titulo.length > 70) titulo = titulo.slice(0, 70).replace(/\s+\S*$/, "");
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  return cortou || titulo.length < primeiraFrase.length - 1 ? `${titulo}…` : titulo;
}

/** O texto falado vira o corpo da ideia: parágrafos simples, sem HTML solto. */
export function corpoDaIdeia(texto: string): string {
  const esc = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n{2,}/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}
