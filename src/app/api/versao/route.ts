/** Qual versão do app está no ar agora. A tela compara com a que ela carregou e avisa quando saiu uma nova. */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ id: process.env.VERCEL_GIT_COMMIT_SHA ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
