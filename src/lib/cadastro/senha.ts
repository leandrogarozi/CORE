import { createClient } from "@supabase/supabase-js";

/**
 * Confere a senha de quem está logado, no servidor, antes de apagar algo que não volta.
 * Tenta entrar com e-mail + senha num cliente descartável (sem guardar sessão), então a
 * sessão do app não muda. Não é só um aviso na tela: a rota recusa sem a senha certa.
 */
export async function senhaDoDonoConfere(email: string | undefined | null, senha: unknown): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!email || typeof senha !== "string" || senha === "" || !url || !chave) return false;
  const descartavel = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await descartavel.auth.signInWithPassword({ email, password: senha });
  return !error;
}
