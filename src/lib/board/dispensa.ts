import type { PantryItem, PantryStatus, Reminder } from "@/lib/types";

/** Categorias sugeridas na tela; a pessoa pode escrever outra. */
export const CATEGORIAS_DA_DISPENSA = ["Casa", "Piscina", "Ferramentas", "Pessoal", "Viagem", "Remédios"] as const;

export const ROTULO_DA_SITUACAO: Record<PantryStatus, string> = {
  ok: "Tenho",
  low: "Acabando",
  out: "Acabou",
};

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Remédio e coisa de saúde: aparece na tela, mas nunca vai para a IA (regra de privacidade do app). */
export function ehRemedioOuSaude(item: Pick<PantryItem, "category">): boolean {
  const c = semAcento(item.category);
  return c.includes("remedio") || c.includes("medicamento") || c.includes("saude");
}

const DIAS_PARA_AVISAR_VALIDADE = 30;

export type SituacaoDaValidade = { tipo: "vencido" | "vence_logo"; dias: number } | null;

/** Validade: vencido (dias < 0) ou vencendo nos próximos 30 dias; fora disso, nada a avisar. */
export function situacaoDaValidade(item: Pick<PantryItem, "expiresOn">, hoje: string): SituacaoDaValidade {
  if (!item.expiresOn) return null;
  const dias = Math.round((new Date(item.expiresOn + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000);
  if (dias < 0) return { tipo: "vencido", dias };
  if (dias <= DIAS_PARA_AVISAR_VALIDADE) return { tipo: "vence_logo", dias };
  return null;
}

/** Precisa comprar: acabou, está acabando ou a quantidade zerou. */
export function precisaComprar(item: Pick<PantryItem, "status" | "quantity">): boolean {
  return item.status !== "ok" || item.quantity <= 0;
}

/** Procura na dispensa por nome (sem acento, qualquer parte), para avisar "você já tem isso" antes de comprar de novo. */
export function acharNaDispensa(itens: PantryItem[], texto: string): PantryItem[] {
  const q = semAcento(texto).trim();
  if (q.length < 3) return [];
  const palavras = q.split(/\s+/).filter((p) => p.length >= 3);
  return itens.filter((i) => {
    const n = semAcento(i.name);
    return n.includes(q) || (palavras.length > 0 && palavras.every((p) => n.includes(p)));
  });
}

/** O título do lembrete de reposição, o mesmo na tela e quando o FARO cria. */
export const tituloDoLembreteDeCompra = (nome: string) => `Comprar: ${nome}`;

/** O lembrete "Comprar: X" que ainda está de pé (não feito, não apagado), para dar baixa quando a pessoa comprar. */
export function lembreteDeCompraPendente(lembretes: Reminder[], nome: string): Reminder | null {
  const alvo = semAcento(tituloDoLembreteDeCompra(nome)).trim();
  return lembretes.find((r) => !r.done && !r.deletedAt && semAcento(r.title).trim() === alvo) ?? null;
}

/** Comprou: volta a "tenho". Quantidade informada vale; sem ela, quem estava em zero passa a ter 1 e o resto fica como está. */
export function aposComprar(item: Pick<PantryItem, "quantity">, quantidade?: number | null): { quantity: number; status: PantryStatus } {
  const q = quantidade && quantidade > 0 ? Math.round(quantidade) : item.quantity > 0 ? item.quantity : 1;
  return { quantity: q, status: "ok" };
}

/** Acha um item da dispensa pelo nome falado: igual, ou único que contém. Ambíguo ou ausente: null. */
export function acharUmItemPeloNome(itens: PantryItem[], nome: string): PantryItem | null {
  const q = semAcento(nome).trim();
  if (!q) return null;
  const exato = itens.filter((i) => semAcento(i.name).trim() === q);
  if (exato.length === 1) return exato[0];
  const contem = acharNaDispensa(itens, nome);
  return contem.length === 1 ? contem[0] : null;
}
