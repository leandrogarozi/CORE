import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { lembreteDoAniversario } from "@/lib/board/aniversarios";
import { birthdayToInsertRow, reminderToInsertRow } from "@/lib/board/mappers";
import type { Birthday, Reminder } from "@/lib/types";

/**
 * A ÚNICA ponte entre o cadastro de clientes e o resto do FARO: leva o
 * aniversário de quem se cadastrou para a lista de Aniversários.
 *
 * Fica separada de propósito. Para abrir o FARO a outras pessoas (ou para quem
 * não quer isso), basta não chamar esta função: o cadastro continua gravando na
 * tabela `clientes_cadastro` e nada mais é tocado.
 */

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

export interface AniversarioDoCadastro {
  usuario: string;
  nome: string;
  whatsapp: string | null;
  aniversario: string; // AAAA-MM-DD
  produto: string;
}

export interface ResultadoDaPonte {
  birthdayId: string | null;
  criou: boolean;
}

export async function levarAniversarioParaOFaro(
  supabase: SupabaseClient<Database>,
  a: AniversarioDoCadastro,
  hojeISO: string
): Promise<ResultadoDaPonte> {
  const [ano, mes, dia] = a.aniversario.split("-").map(Number);

  // Já existe alguém com esse nome na lista (ele mesmo adicionou antes): não duplica e não mexe.
  const { data: existentes, error: erroLista } = await supabase
    .from("birthdays")
    .select("name")
    .eq("user_id", a.usuario)
    .is("deleted_at", null);
  if (erroLista) throw new Error(`ler aniversários: ${erroLista.message}`);
  const alvo = semAcento(a.nome);
  if ((existentes ?? []).some((b) => semAcento(b.name) === alvo)) return { birthdayId: null, criou: false };

  const b: Birthday = {
    id: crypto.randomUUID(),
    name: a.nome,
    month: mes,
    day: dia,
    year: ano,
    category: "cliente",
    phone: a.whatsapp ?? "",
    message: "",
    autoMessage: false,
    remind: true,
    remindWhatsapp: false,
    note: `Veio do cadastro "${a.produto}" em ${hojeISO.split("-").reverse().join("/")}.`,
    order: (existentes ?? []).length,
  };
  const { error } = await supabase.from("birthdays").insert(birthdayToInsertRow(b, a.usuario));
  if (error) throw new Error(`criar aniversário: ${error.message}`);

  const campos = lembreteDoAniversario(b, hojeISO);
  if (campos) {
    const r: Reminder = {
      id: crypto.randomUUID(),
      title: campos.title,
      date: campos.date,
      time: campos.time,
      repeat: "yearly",
      weekDays: null,
      alertMinutesBefore: null,
      note: null,
      done: false,
      status: "pending",
      deletedAt: null,
      taskId: null,
      sourceKind: "birthday",
      sourceId: b.id,
      sourceStage: "item",
      inApp: true,
      whatsapp: false,
    };
    const { error: erroLembrete } = await supabase.from("reminders").insert(reminderToInsertRow(r, a.usuario));
    if (erroLembrete) throw new Error(`criar lembrete do aniversário: ${erroLembrete.message}`);
  }
  return { birthdayId: b.id, criou: true };
}
