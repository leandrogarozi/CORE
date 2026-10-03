import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Manda um push avulso (não ligado a lembrete) pra todos os aparelhos de um
 * usuário. Aparelho que o navegador diz estar morto (404/410) é removido.
 * Devolve quantos aparelhos receberam.
 */
export async function enviarPushAoUsuario(
  supabase: SupabaseClient<Database>,
  userId: string,
  mensagem: { title: string; body: string; url?: string }
): Promise<number> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return 0;
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  const payload = JSON.stringify({ title: mensagem.title, body: mensagem.body, url: mensagem.url ?? "/" });
  const mortos: string[] = [];
  let chegou = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        chegou++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) mortos.push(s.endpoint);
      }
    })
  );
  if (mortos.length) await supabase.from("push_subscriptions").delete().eq("user_id", userId).in("endpoint", mortos);
  return chegou;
}
