/**
 * Feriados e pontos facultativos NACIONAIS do Brasil, calculados (sem internet): os de data fixa mais os que
 * dependem da Páscoa (Carnaval, Sexta-feira Santa, Corpus Christi). Feriados estaduais e municipais variam de
 * lugar para lugar e não entram aqui.
 */
export type TipoDeFeriado = "feriado" | "facultativo";

export interface Feriado {
  data: string; // AAAA-MM-DD
  nome: string;
  tipo: TipoDeFeriado;
}

/** Domingo de Páscoa (calendário gregoriano, algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const somaDias = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const cache = new Map<number, Feriado[]>();

/** Todos os feriados e pontos facultativos nacionais do ano, em ordem de data. */
export function feriadosDoAno(ano: number): Feriado[] {
  const pronto = cache.get(ano);
  if (pronto) return pronto;
  const p = pascoa(ano);
  const fixo = (mes: number, dia: number, nome: string, tipo: TipoDeFeriado = "feriado"): Feriado => ({
    data: `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
    nome,
    tipo,
  });
  const daPascoa = (dias: number, nome: string, tipo: TipoDeFeriado): Feriado => ({ data: iso(somaDias(p, dias)), nome, tipo });
  const lista: Feriado[] = [
    fixo(1, 1, "Confraternização Universal"),
    daPascoa(-48, "Segunda-feira de Carnaval", "facultativo"),
    daPascoa(-47, "Terça-feira de Carnaval", "facultativo"),
    daPascoa(-46, "Quarta-feira de Cinzas (até as 14h)", "facultativo"),
    daPascoa(-2, "Sexta-feira Santa", "feriado"),
    fixo(4, 21, "Tiradentes"),
    fixo(5, 1, "Dia do Trabalho"),
    daPascoa(60, "Corpus Christi", "facultativo"),
    fixo(9, 7, "Independência do Brasil"),
    fixo(10, 12, "Nossa Senhora Aparecida"),
    fixo(10, 28, "Dia do Servidor Público", "facultativo"),
    fixo(11, 2, "Finados"),
    fixo(11, 15, "Proclamação da República"),
    // Consciência Negra é feriado nacional desde 2024.
    ...(ano >= 2024 ? [fixo(11, 20, "Consciência Negra")] : []),
    fixo(12, 24, "Véspera de Natal (a partir das 14h)", "facultativo"),
    fixo(12, 25, "Natal"),
    fixo(12, 31, "Véspera de Ano Novo (a partir das 14h)", "facultativo"),
  ].sort((a, b) => a.data.localeCompare(b.data));
  cache.set(ano, lista);
  return lista;
}

/** O feriado (ou ponto facultativo) de um dia, ou null. */
export function feriadoDe(dia: string): Feriado | null {
  const ano = Number(dia.slice(0, 4));
  if (!Number.isFinite(ano)) return null;
  return feriadosDoAno(ano).find((f) => f.data === dia) ?? null;
}

/** Os feriados entre duas datas (inclusive). */
export function feriadosEntre(de: string, ate: string): Feriado[] {
  const anos = new Set([Number(de.slice(0, 4)), Number(ate.slice(0, 4))]);
  return [...anos].flatMap((a) => feriadosDoAno(a)).filter((f) => f.data >= de && f.data <= ate).sort((a, b) => a.data.localeCompare(b.data));
}
