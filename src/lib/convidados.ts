const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Só e-mails que parecem e-mails, em minúsculas e sem repetir. */
export function convidadosValidos(lista: string[]): string[] {
  return [...new Set(lista.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
}

/** Do que a pessoa digitou ("ana@x.com, bo@y.com; cy@z.com") para a lista de e-mails. */
export function separarConvidados(texto: string): string[] {
  return convidadosValidos(texto.split(/[\s,;]+/));
}

/** Do que foi digitado, o que NÃO parece e-mail (para avisar). */
export function convidadosInvalidos(texto: string): string[] {
  const ok = new Set(separarConvidados(texto));
  return texto
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter((e) => e && !ok.has(e.toLowerCase()));
}
