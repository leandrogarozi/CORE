import { isoAddDays } from "@/lib/date-utils";
import { stripHtml } from "@/lib/rich-text";
import type { ShoppingItem } from "@/lib/types";

/**
 * Compra pendente = ainda não comprei, OU já comprei mas chegou o dia de
 * comprar de novo (o "relembrar em X dias"). Nada é gravado quando o dia chega:
 * o item volta pra lista só por essa regra, e o lembrete do dia sai sozinho.
 */
export function compraPendente(i: Pick<ShoppingItem, "done" | "repeatDays" | "remindOn">, hojeISO: string): boolean {
  if (!i.done) return true;
  return !!i.repeatDays && !!i.remindOn && i.remindOn <= hojeISO;
}

/** O que muda quando marco "comprei" (ou desmarco). */
export function aoMarcarComprado(
  i: Pick<ShoppingItem, "repeatDays" | "remindOn">,
  hojeISO: string,
  comprou: boolean
): Pick<ShoppingItem, "done" | "doneOn" | "remindOn"> {
  if (!comprou) return { done: false, doneOn: null, remindOn: i.remindOn };
  // Com "relembrar em X dias", a próxima data nasce de hoje. Sem isso, um lembrete
  // avulso já usado deixa de valer.
  return {
    done: true,
    doneOn: hojeISO,
    remindOn: i.repeatDays && i.repeatDays > 0 ? isoAddDays(hojeISO, i.repeatDays) : null,
  };
}

/** O lembrete do item, ou null quando não há o que lembrar. */
export function lembreteDaCompra(
  i: Pick<ShoppingItem, "kind" | "name" | "done" | "remindOn" | "remindTime">,
  hojeISO: string
): { title: string; date: string; time: string } | null {
  if (!i.remindOn || i.remindOn < hojeISO) return null;
  const titulo =
    i.kind === "desejo" ? `Lembrete da lista de desejos: ${i.name}` : i.done ? `Comprar de novo: ${i.name}` : `Comprar: ${i.name}`;
  return { title: titulo, date: i.remindOn, time: i.remindTime || "09:00" };
}

/** A lista em tópicos, pro WhatsApp (o link wa.me aceita quebra de linha). */
export function textoDaLista(itens: ShoppingItem[], kind: "compra" | "desejo", hojeISO: string): string {
  const doTipo = itens.filter((i) => i.kind === kind);
  if (kind === "compra") {
    const pend = doTipo.filter((i) => compraPendente(i, hojeISO));
    return ["🛒 *Lista de compras*", "", ...pend.map((i) => `• ${i.name}`)].join("\n");
  }
  const linhas = ["⭐ *Lista de desejos*", ""];
  for (const i of doTipo) {
    linhas.push(`• ${i.name}`);
    const nota = stripHtml(i.note).replace(/\s+/g, " ").trim();
    if (nota) linhas.push(`   ${nota}`);
    for (const l of i.links) linhas.push(`   ${l.title.trim() ? `${l.title.trim()}: ` : ""}${l.url}`);
  }
  return linhas.join("\n");
}
