import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente com a service role key — ignora RLS. Só pra rotinas server-to-server
 * sem usuário logado (ex.: o cron que dispara lembretes por WhatsApp). Nunca
 * importar isso em código que roda no navegador.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor");
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
