import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino do link dos e-mails do FARO (confirmar conta, redefinir senha, trocar e-mail).
 *
 * Confere o código do próprio link (`token_hash`), então funciona em qualquer navegador ou aparelho: quem criou a
 * conta no computador pode abrir o e-mail no celular. O fluxo com `code` (`/auth/callback`) só funciona no mesmo
 * navegador onde o pedido começou.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? (type === "recovery" ? "/reset-password" : "/");
  // Só caminhos do próprio app: nada de levar a pessoa para fora do site depois de entrar.
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/login?erro=link`);
}
