import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  // "local": sair neste aparelho não derruba a sessão dos outros (o padrão do Supabase é sair de todos).
  await supabase.auth.signOut({ scope: "local" });
  // 303: depois do POST do botão Sair o navegador abre /login com GET.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
