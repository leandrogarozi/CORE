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

export interface ItemDeTexto {
  name: string;
  quantity: number;
  unit: string;
  status: PantryStatus;
  place: string;
  expiresOn: string | null;
}

const UNIDADES = /^(kg|g|l|ml|un|unid|unidades?|caixas?|pacotes?|potes?|litros?|frascos?|tubos?|sacos?|latas?)$/i;

/** "vence 12/12" ou "vence em 12/12/2026" -> ISO. Sem ano, vale o próximo 12/12. */
function validadeDoTexto(t: string, hoje: string): { resto: string; iso: string | null } {
  const m = t.match(/\bvenc\w*\s+(?:em\s+|dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
  if (!m) return { resto: t, iso: null };
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let ano = m[3] ? Number(m[3]) : Number(hoje.slice(0, 4));
  if (ano < 100) ano += 2000;
  let iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  if (!m[3] && iso < hoje) iso = `${ano + 1}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const d = new Date(iso + "T12:00:00");
  const valido = !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
  return { resto: t.replace(m[0], " "), iso: valido ? iso : null };
}

/**
 * Lê uma anotação escrita ou ditada como lista ("2 refis de filtro no armário; cloro 2 kg acabando, protetor vence 12/12")
 * e separa em itens. Um item por linha, ponto e vírgula ou vírgula. Entende quantidade no começo, "acabando"/"acabou",
 * "no/na lugar" e "vence dd/mm". Serve de prévia: a pessoa confere antes de criar.
 */
export function itensDeUmTexto(texto: string, hoje: string): ItemDeTexto[] {
  const pedacos = texto
    .split(/\n|;|,(?!\d)/)
    .map((p) => p.trim())
    .filter(Boolean);
  const itens: ItemDeTexto[] = [];
  for (const bruto of pedacos.slice(0, 60)) {
    let t = bruto.replace(/^[\s\-•*–—]+/, "").trim();
    if (t.length < 2) continue;
    let status: PantryStatus = "ok";
    if (/\b(acabou|zerou|n[aã]o tenho mais)\b/i.test(t)) status = "out";
    else if (/\b(acabando|quase acabando|pouco|baixo)\b/i.test(t)) status = "low";
    t = t.replace(/\b(quase acabando|acabando|acabou|zerou|n[aã]o tenho mais|pouco|baixo)\b/gi, " ");
    const v = validadeDoTexto(t, hoje);
    t = v.resto;
    let place = "";
    const lugar = t.match(/\s(?:no|na|nos|nas|em)\s+(?!\d)(.+)$/i);
    if (lugar) {
      place = lugar[1].replace(/\s+/g, " ").trim();
      t = t.slice(0, lugar.index);
    }
    let quantity = 1;
    let unit = "";
    const q = t.trim().match(/^(\d+)\s*(.*)$/);
    if (q && q[2].trim()) {
      quantity = Number(q[1]);
      const palavras = q[2].trim().split(/\s+/);
      if (UNIDADES.test(palavras[0]) && palavras.length > 1) {
        unit = palavras.shift()!.toLowerCase();
        if (palavras[0]?.toLowerCase() === "de") palavras.shift();
      }
      t = palavras.join(" ");
    } else if (!q) {
      // "cloro 2 kg": quantidade depois do nome, só quando vem com unidade (senão "FPS 50" viraria 50 unidades)
      const fim = t.trim().match(/^(.*?)\s+(\d+)\s*([a-zA-Z]+)$/);
      if (fim && fim[1].trim() && UNIDADES.test(fim[3])) {
        quantity = Number(fim[2]);
        unit = fim[3].toLowerCase();
        t = fim[1];
      }
    }
    const name = t.replace(/\s+/g, " ").replace(/[\s.:-]+$/, "").trim();
    if (!name) continue;
    // "lâmpada 9W, 4 na gaveta": o pedaço só com número completa o item anterior.
    if (/^\d+$/.test(name) && itens.length > 0) {
      const anterior = itens[itens.length - 1];
      anterior.quantity = Number(name);
      if (place && !anterior.place) anterior.place = place;
      continue;
    }
    if (status === "out") quantity = 0;
    itens.push({ name: name[0].toUpperCase() + name.slice(1), quantity, unit, status, place, expiresOn: v.iso });
  }
  return itens;
}
