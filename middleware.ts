import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // /api/ fica de fora: o middleware redireciona quem nao tem sessao pro /login,
  // e isso quebrava as chamadas server-to-server (o cron dos lembretes chegava
  // como POST em /login e voltava 405). Toda rota de API ja valida sozinha — as
  // do app pela sessao do usuario, a do cron pelo CRON_SECRET.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
