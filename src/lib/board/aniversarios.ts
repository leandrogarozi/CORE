import type { Birthday } from "@/lib/types";

/**
 * Aniversários: contas de data e mensagem, sem tela e sem rede (por isso
 * testável). O ano de nascimento é opcional: muita gente a gente só sabe o dia.
 */

export const CATEGORIAS_DE_ANIVERSARIO: { id: Birthday["category"]; rotulo: string; plural: string }[] = [
  { id: "cliente", rotulo: "Cliente", plural: "Clientes" },
  { id: "amigo", rotulo: "Amigo", plural: "Amigos" },
  { id: "familiar", rotulo: "Familiar", plural: "Familiares" },
];

export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const MENSAGEM_PADRAO = "Parabéns, {nome}! 🎉 Que seu dia seja incrível. Um abraço!";

const pad = (n: number) => String(n).padStart(2, "0");

function ehBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** O dia no ano dado. 29/02 em ano que não é bissexto cai em 28/02. */
function dataNoAno(ano: number, mes: number, dia: number): string {
  const d = mes === 2 && dia === 29 && !ehBissexto(ano) ? 28 : dia;
  return `${ano}-${pad(mes)}-${pad(d)}`;
}

/** A próxima vez que o aniversário cai, de hoje (inclusive) em diante. */
export function proximaData(mes: number, dia: number, hojeISO: string): string {
  const ano = Number(hojeISO.slice(0, 4));
  const esteAno = dataNoAno(ano, mes, dia);
  return esteAno >= hojeISO ? esteAno : dataNoAno(ano + 1, mes, dia);
}

function diasEntre(deISO: string, ateISO: string): number {
  const [y1, m1, d1] = deISO.split("-").map(Number);
  const [y2, m2, d2] = ateISO.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function diasAteAniversario(b: Pick<Birthday, "month" | "day">, hojeISO: string): number {
  return diasEntre(hojeISO, proximaData(b.month, b.day, hojeISO));
}

/** Quantos anos faz no próximo aniversário (null quando não sabemos o ano). */
export function idadeQueFara(b: Pick<Birthday, "month" | "day" | "year">, hojeISO: string): number | null {
  if (!b.year) return null;
  return Number(proximaData(b.month, b.day, hojeISO).slice(0, 4)) - b.year;
}

export function rotuloDosDias(dias: number): string {
  if (dias === 0) return "hoje 🎉";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

export function dataCurta(b: Pick<Birthday, "month" | "day">): string {
  return `${pad(b.day)}/${pad(b.month)}`;
}

/** Os mais próximos primeiro; empate pela ordem alfabética. */
export function ordenarPorProximos<T extends Pick<Birthday, "month" | "day" | "name">>(lista: T[], hojeISO: string): T[] {
  return [...lista].sort(
    (a, b) => diasAteAniversario(a, hojeISO) - diasAteAniversario(b, hojeISO) || a.name.localeCompare(b.name, "pt-BR")
  );
}

/** A mensagem pronta com o nome da pessoa no lugar de {nome}. */
export function mensagemDoAniversario(b: Pick<Birthday, "name" | "message">): string {
  const modelo = b.message.trim() || MENSAGEM_PADRAO;
  const primeiro = b.name.trim().split(/\s+/)[0] ?? b.name;
  return modelo.replace(/\{nome\}/gi, primeiro);
}

/** Número só com dígitos; sem DDI (10 ou 11 dígitos) entra o 55 do Brasil. */
export function telefoneParaWhatsApp(telefone: string): string | null {
  const d = telefone.replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.length <= 11 ? `55${d}` : d;
}

export function linkDoWhatsApp(b: Pick<Birthday, "name" | "phone" | "message">): string | null {
  const numero = telefoneParaWhatsApp(b.phone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemDoAniversario(b))}`;
}

/** O lembrete "mande a mensagem pessoal", ou null se a pessoa não pediu lembrete. */
export function lembreteDoAniversario(
  b: Pick<Birthday, "name" | "month" | "day" | "remind">,
  hojeISO: string
): { title: string; date: string; time: string } | null {
  if (!b.remind) return null;
  return {
    title: `🎂 Aniversário de ${b.name.trim()}: mandar a mensagem`,
    date: proximaData(b.month, b.day, hojeISO),
    time: "09:00",
  };
}
