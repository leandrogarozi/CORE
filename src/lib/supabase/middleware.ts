import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  // Termos e Privacidade são públicos (o Google e o WhatsApp exigem o endereço aberto, e quem vai criar conta precisa ler).
  // /auth/ também: é onde o link do e-mail chega, ainda sem sessão, para confirmar a conta.
  const isPublicPage = ["/termos", "/privacidade"].some((p) => request.nextUrl.pathname === p) || request.nextUrl.pathname.startsWith("/auth/");

  if (!user && !isAuthRoute && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // O Supabase devolve link vencido como /?error_code=otp_expired: leva o aviso até a tela de entrada.
    url.search = request.nextUrl.searchParams.has("error_code") ? "?erro=link" : "";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
