import type { Birthday, BirthdayPhrase } from "@/lib/types";

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

/**
 * As 4 frases prontas de aniversário (a fila do rodízio). O Leandro troca o texto delas em
 * Aniversários; estas são as de partida.
 */
export const FRASES_PADRAO: BirthdayPhrase[] = [
  {
    titulo: "Mais próxima e afetiva",
    texto:
      "Parabéns, {nome}! 🎉 Que este novo ciclo te lembre do quanto você é capaz, e que você nunca desista do que Deus colocou no seu coração. Fico feliz de caminhar ao seu lado. Um abraço grande!",
  },
  {
    titulo: "Com a sua missão, direta",
    texto:
      "{nome}, parabéns pela vida! 🙏 Meu desejo para este novo ano é simples: que você acredite mais em você e que nunca desista do que está construindo. Conte comigo nessa caminhada. Abraço!",
  },
  {
    titulo: "Com o Movimento do MPM",
    texto:
      "Parabéns, {nome}! 🎉 Que este novo ano seja de movimento: enxergar mais de si, mudar o que precisa mudar e seguir firme no que importa. Estou torcendo por você. Um abraço!",
  },
  {
    titulo: "Curta, para quem você conhece menos",
    texto: "Parabéns, {nome}! Que Deus abençoe seu novo ciclo e que você acredite sempre mais em você. Um abraço!",
  },
];

/** As frases em uso: as que ele escreveu (sem as vazias) ou as 4 de partida. */
export function frasesEmUso(escolhidas: BirthdayPhrase[] | null | undefined): BirthdayPhrase[] {
  const validas = (escolhidas ?? []).filter((f) => f.texto.trim() !== "");
  return validas.length ? validas : FRASES_PADRAO;
}

/** Quem ainda não escolheu a frase começa pela primeira; depois que uma é enviada, vai para a seguinte da fila. */
export function proximaFrase(slotAtual: number | null, total: number): number {
  if (total <= 0) return 0;
  return slotAtual === null ? 0 : (slotAtual + 1) % total;
}

/**
 * A mensagem pronta com o nome da pessoa no lugar de {nome}. Texto próprio da pessoa
 * primeiro; se não tem, vale a primeira frase pronta.
 */
export function mensagemDoAniversario(b: Pick<Birthday, "name" | "message">, frases?: BirthdayPhrase[] | null): string {
  const modelo = b.message.trim() || frasesEmUso(frases)[0].texto || MENSAGEM_PADRAO;
  return textoComNome(modelo, b.name);
}

/** {nome} vira o primeiro nome. */
export function textoComNome(modelo: string, nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome;
  return modelo.replace(/\{nome\}/gi, primeiro);
}

/** Número só com dígitos; sem DDI (10 ou 11 dígitos) entra o 55 do Brasil. */
export function telefoneParaWhatsApp(telefone: string): string | null {
  const d = telefone.replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.length <= 11 ? `55${d}` : d;
}

export function linkDoWhatsApp(b: Pick<Birthday, "name" | "phone" | "message">, frases?: BirthdayPhrase[] | null): string | null {
  const numero = telefoneParaWhatsApp(b.phone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemDoAniversario(b, frases))}`;
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

const compararNomes = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

export interface GruposPorProximidade<T> {
  hoje: T[]; // faz aniversário hoje (verde)
  perto: T[]; // nos próximos dias (amarelo)
  resto: T[]; // o resto, em ordem alfabética
}

/**
 * Ordem das listas de Aniversários e de Clientes: quem faz aniversário hoje vem primeiro
 * (verde), depois quem faz nos próximos `janela` dias (amarelo, do mais perto ao mais longe),
 * e o resto em ordem alfabética. Passou o dia, a pessoa volta para a fila normal sozinha.
 */
export function agruparPorProximidade<T>(
  lista: T[],
  diasAte: (x: T) => number | null,
  nomeDe: (x: T) => string,
  janela = 3
): GruposPorProximidade<T> {
  const hoje: T[] = [];
  const perto: T[] = [];
  const resto: T[] = [];
  for (const x of lista) {
    const d = diasAte(x);
    if (d === 0) hoje.push(x);
    else if (d !== null && d > 0 && d <= janela) perto.push(x);
    else resto.push(x);
  }
  hoje.sort((a, b) => compararNomes(nomeDe(a), nomeDe(b)));
  perto.sort((a, b) => (diasAte(a)! - diasAte(b)!) || compararNomes(nomeDe(a), nomeDe(b)));
  resto.sort((a, b) => compararNomes(nomeDe(a), nomeDe(b)));
  return { hoje, perto, resto };
}
