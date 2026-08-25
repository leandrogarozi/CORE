import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (url && anonKey && !/^[\x00-\xFF]*$/.test(anonKey)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY contains characters outside ISO-8859-1 — this usually means the masked " +
      "placeholder (e.g. \"eyJhbGci••••••\") was pasted into the environment variable instead of the real key."
  );
}

export function createClient() {
  return createBrowserClient<Database>(url!, anonKey!);
}
