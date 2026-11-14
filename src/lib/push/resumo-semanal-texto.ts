/**
 * O texto do "Como foi sua semana": só números comparados com a semana anterior, sem IA (custo zero, resultado
 * previsível). Puro, sem rede: a rotina do servidor busca os números e chama aqui.
 */
export interface DadosDaSemana {
  tarefas: number;
  /** Horas cronometradas (todas as tarefas). */
  horas: number;
  /** Horas cronometradas em planos de estudo. */
  estudoHoras: number;
  /** Dias da semana em que cada hábito foi marcado (nome → dias). */
  habitos: Record<string, number>;
  humor: number | null;
  /** Sono médio em minutos. */
  sonoMin: number | null;
}

export interface TextoDaSemana {
  titulo: string;
  /** Texto completo, uma ideia por linha (caixa de Avisos). */
  corpo: string;
  /** Versão curta do push. */
  push: string;
}

const num = (n: number, c = 1) => n.toFixed(c).replace(".", ",").replace(/,0$/, "");
const horasMin = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;
const seta = (d: number) => (d > 0 ? "↑" : d < 0 ? "↓" : "=");

export function textoDaSemana(atual: DadosDaSemana, anterior: DadosDaSemana): TextoDaSemana | null {
  const algo = atual.tarefas > 0 || atual.horas > 0 || Object.values(atual.habitos).some((n) => n > 0);
  if (!algo) return null;

  const linhas: string[] = [];
  const dt = atual.tarefas - anterior.tarefas;
  linhas.push(`Tarefas: ${atual.tarefas} concluída${atual.tarefas === 1 ? "" : "s"} (${dt === 0 ? "igual à semana passada" : `${seta(dt)} ${Math.abs(dt)} em relação à semana passada`}).`);
  if (atual.horas > 0 || anterior.horas > 0) {
    const dh = atual.horas - anterior.horas;
    linhas.push(`Tempo cronometrado: ${num(atual.horas)}h (${Math.abs(dh) < 0.1 ? "igual" : `${seta(dh)} ${num(Math.abs(dh))}h`}).`);
  }
  if (atual.estudoHoras > 0 || anterior.estudoHoras > 0) {
    const de = atual.estudoHoras - anterior.estudoHoras;
    linhas.push(`Estudo: ${num(atual.estudoHoras)}h (${Math.abs(de) < 0.1 ? "igual" : `${seta(de)} ${num(Math.abs(de))}h`}).`);
  }

  const nomes = [...new Set([...Object.keys(atual.habitos), ...Object.keys(anterior.habitos)])];
  const subiu: string[] = [];
  const caiu: string[] = [];
  const igual: string[] = [];
  for (const n of nomes) {
    const a = atual.habitos[n] ?? 0;
    const b = anterior.habitos[n] ?? 0;
    const fmt = `${n} ${a} ${a === 1 ? "dia" : "dias"} (era ${b})`;
    if (a > b) subiu.push(fmt);
    else if (a < b) caiu.push(fmt);
    else if (a > 0) igual.push(`${n} ${a}`);
  }
  if (subiu.length) linhas.push(`Subiu: ${subiu.join("; ")}.`);
  if (caiu.length) linhas.push(`Caiu: ${caiu.join("; ")}.`);
  if (igual.length) linhas.push(`Igual: ${igual.join("; ")}.`);

  const extras: string[] = [];
  if (atual.humor !== null) extras.push(`humor médio ${num(atual.humor)}${anterior.humor !== null ? ` (era ${num(anterior.humor)})` : ""}`);
  if (atual.sonoMin !== null) extras.push(`sono médio ${horasMin(atual.sonoMin)}${anterior.sonoMin !== null ? ` (era ${horasMin(anterior.sonoMin)})` : ""}`);
  if (extras.length) linhas.push(`${extras.join("; ")[0].toUpperCase()}${extras.join("; ").slice(1)}.`);

  const curto = [
    `${atual.tarefas} tarefas (${seta(dt)}${dt === 0 ? "" : Math.abs(dt)})`,
    atual.horas > 0 ? `${num(atual.horas)}h cronometradas` : null,
    subiu.length ? `Subiu: ${subiu.map((s) => s.split(" (")[0]).join(", ")}` : null,
    caiu.length ? `Caiu: ${caiu.map((s) => s.split(" (")[0]).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return { titulo: "Como foi sua semana", corpo: linhas.join("\n"), push: curto.length > 170 ? curto.slice(0, 167) + "…" : curto };
}
