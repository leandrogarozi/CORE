import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppTestMessage } from "@/lib/whatsapp/send";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { data: settings, error } = await supabase.from("settings").select("notify_phone").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!settings?.notify_phone) {
    return NextResponse.json({ error: "Cadastre seu WhatsApp/telefone no Perfil primeiro" }, { status: 400 });
  }

  const result = await sendWhatsAppTestMessage(settings.notify_phone);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
