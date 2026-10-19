import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
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

  // Entra como "aguardando confirmação": sem lembrete anual e sem mensagem ativa até o Leandro
  // conferir os dados e apertar "Confirmar cliente" (aí ele cuida da mensagem e do WhatsApp).
  // No lugar, vai UMA tarefa (lembrete comum, de hoje) pedindo essa conferência.
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
    remind: false,
    remindWhatsapp: false,
    noSend: false,
    pending: true,
    messageSlot: null,
    lastSentYear: null,
    lastSentSlot: null,
    note: `Veio do cadastro "${a.produto}" em ${hojeISO.split("-").reverse().join("/")}.`,
    order: (existentes ?? []).length,
  };
  const { error } = await supabase.from("birthdays").insert(birthdayToInsertRow(b, a.usuario));
  if (error) throw new Error(`criar aniversário: ${error.message}`);

  const r: Reminder = {
    id: crypto.randomUUID(),
    title: `Conferir o cadastro de ${a.nome}: aniversário, mensagem e WhatsApp`,
    date: hojeISO,
    time: "09:00",
    repeat: "none",
    weekDays: null,
    alertMinutesBefore: null,
    note: "Abra Aniversários, confira os dados e aperte “Confirmar cliente”.",
    done: false,
    status: "pending",
    deletedAt: null,
    taskId: null,
    sourceKind: null,
    sourceId: null,
    // Liga a tarefa à pessoa: “Confirmar cliente” dá a tarefa como feita.
    sourceStage: `cadastro:${b.id}`,
    inApp: true,
    whatsapp: false,
  };
  const { error: erroLembrete } = await supabase.from("reminders").insert(reminderToInsertRow(r, a.usuario));
  if (erroLembrete) throw new Error(`criar tarefa de conferência: ${erroLembrete.message}`);
  return { birthdayId: b.id, criou: true };
}
