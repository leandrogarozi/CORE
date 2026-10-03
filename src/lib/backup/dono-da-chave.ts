import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/** O dono da chave de backup enviada em `Authorization: Bearer faro_bk_...`, ou null. */
export async function donoDaChave(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token.startsWith("faro_bk_")) return null;
  const { data } = await createServiceClient().from("backup_status").select("user_id").eq("token", token).maybeSingle();
  return data?.user_id ?? null;
}
