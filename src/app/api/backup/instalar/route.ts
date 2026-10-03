import { NextRequest, NextResponse } from "next/server";
import { instaladorMac, instaladorWindows } from "@/lib/backup/instaladores";

export const dynamic = "force-dynamic";

/**
 * Entrega o texto do instalador do backup automático. Público de propósito: é
 * um script igual para todo mundo e NÃO carrega segredo — a chave vai como
 * argumento do comando que a tela de Configurações mostra.
 */
export function GET(req: NextRequest) {
  const so = req.nextUrl.searchParams.get("so");
  const base = req.nextUrl.origin;
  const texto = so === "win" ? instaladorWindows(base) : instaladorMac(base);
  return new NextResponse(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
