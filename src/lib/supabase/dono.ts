import { createClient } from "@/lib/supabase/server";

/** O id de quem está logado, se for o dono do FARO (conta com `modo_dono` nas configurações); senão null. */
export async function donoLogado(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("settings").select("feature_flags").eq("user_id", user.id).maybeSingle();
  const flags = (data?.feature_flags ?? {}) as Record<string, boolean>;
  return flags.modo_dono === true ? user.id : null;
}
