import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * "Não enviar": a pessoa marcada na tela Clientes não recebe NENHUM envio do FARO
 * (mensagem de WhatsApp, parabéns de aniversário, e-mail). Todo ponto de envio
 * passa por aqui antes de mandar. A marca só sai quando o dono desmarca: uma
 * resposta nova pelo site nunca a desfaz (ver `processar.ts`).
 *
 * Quem confere o ENVIO é o servidor (service role: precisa enxergar a marca de
 * qualquer dono). Se a conferência falhar, não envia: errar para o lado de não
 * mandar é o certo para quem pediu para não receber.
 */

export type ResultadoDaConferencia = { pode: true } | { pode: false; motivo: string };

const MOTIVO = "Pessoa marcada como \"não enviar\" na tela Clientes.";

export async function conferirNumero(supabase: SupabaseClient<Database>, numero: string): Promise<ResultadoDaConferencia> {
  const digitos = numero.replace(/\D/g, "");
  if (!digitos) return { pode: true };
  const [cli, aniv] = await Promise.all([
    supabase.from("clientes_cadastro").select("id").eq("whatsapp_norm", digitos).eq("nao_enviar", true).limit(1),
    // Aniversários guarda o telefone como a pessoa escreveu: compara pelos dígitos, com o DDI do Brasil.
    supabase.from("birthdays").select("phone").eq("nao_enviar", true).is("deleted_at", null),
  ]);
  if (cli.error || aniv.error) return { pode: false, motivo: "Não consegui conferir a marca de \"não enviar\"; por segurança não enviei." };
  const noAniv = (aniv.data ?? []).some((b) => {
    const d = b.phone.replace(/\D/g, "");
    if (d.length < 10) return false;
    return (d.length <= 11 ? `55${d}` : d) === digitos;
  });
  return cli.data?.length || noAniv ? { pode: false, motivo: MOTIVO } : { pode: true };
}

export async function conferirEmail(supabase: SupabaseClient<Database>, email: string): Promise<ResultadoDaConferencia> {
  const norm = email.trim().toLowerCase();
  if (!norm) return { pode: true };
  const { data, error } = await supabase.from("clientes_cadastro").select("id").eq("email_norm", norm).eq("nao_enviar", true).limit(1);
  if (error) return { pode: false, motivo: "Não consegui conferir a marca de \"não enviar\"; por segurança não enviei." };
  return data?.length ? { pode: false, motivo: MOTIVO } : { pode: true };
}
