import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Exportação completa dos dados do usuário, em JSON.
 *
 * Esta rota SÓ LÊ. Não existe aqui nenhum caminho que escreva, apague ou altere
 * — e isso é decisão de projeto, não acaso: um backup que consegue estragar o
 * que está salvo não é backup. É por isso que ela pode rodar a qualquer hora,
 * inclusive com o Leandro usando o app.
 *
 * Usa o cliente do usuário logado (nunca o service role), então é o próprio RLS
 * do banco que garante que cada um exporta só as próprias linhas. A rota não
 * precisa filtrar nada por conta própria, e não tem como vazar dado de outro.
 */

/**
 * Lista explícita, e não descoberta automática do schema.
 *
 * Descobrir as tabelas sozinho parece mais esperto até o dia em que uma tabela
 * nova entra no backup sem ninguém ter pensado nela — ou, pior, some dele sem
 * ninguém perceber. Escrito na mão, adicionar tabela vira uma decisão
 * consciente, que aparece no diff e é revisada.
 */
const TABELAS = [
  "settings",
  "tasks",
  "task_statuses",
  "task_series",
  "task_time_entries",
  "task_postponements",
  "projects",
  "reminders",
  "habits",
  "habit_logs",
  "fixed_blocks",
  "fixed_block_logs",
  "fixed_block_log_entries",
  "daily_logs",
  "books",
  "synapses",
  "checklists",
  "attachments",
  "medications",
  "medication_groups",
  "diet_meals",
  "study_plans",
  "maintenance_assets",
  "maintenance_items",
  "maintenance_services",
  "maintenance_odometer_readings",
  "saude_plano",
  "saude_registros",
  "saude_resumos",
  "saude_desafios",
  "saude_fotos",
  "whatsapp_sends",
  "push_subscriptions",
  "active_timer",
] as const;

/**
 * O Supabase devolve no máximo 1000 linhas por consulta, calado. Sem paginar,
 * uma tabela que passasse de mil linhas seria cortada e o arquivo continuaria
 * parecendo um backup completo — o pior jeito possível de falhar. Por isso a
 * leitura vai em páginas até vir uma página incompleta.
 */
const PAGINA = 1000;

type Linha = Record<string, unknown>;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const dados: Record<string, Linha[]> = {};
  const contagem: Record<string, number> = {};
  const falhas: Record<string, string> = {};

  for (const tabela of TABELAS) {
    const linhas: Linha[] = [];
    let de = 0;
    for (;;) {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .range(de, de + PAGINA - 1);
      if (error) {
        // Uma tabela que falha não pode derrubar o backup inteiro: o resto dos
        // dados continua valendo. Mas a falha vai NO ARQUIVO, para o backup
        // nunca se apresentar como completo quando não é.
        falhas[tabela] = error.message;
        break;
      }
      const pagina = (data ?? []) as Linha[];
      linhas.push(...pagina);
      if (pagina.length < PAGINA) break;
      de += PAGINA;
    }
    if (!falhas[tabela]) {
      dados[tabela] = linhas;
      contagem[tabela] = linhas.length;
    }
  }

  const geradoEm = new Date().toISOString();
  const arquivo = {
    // O manifesto é o que permite conferir o backup sem abrir os dados: dá pra
    // olhar a contagem e saber na hora se o arquivo está gordo ou magro demais.
    manifesto: {
      app: "FARO",
      formato: 1,
      geradoEm,
      usuario: user.id,
      tabelas: TABELAS.length,
      totalLinhas: Object.values(contagem).reduce((a, b) => a + b, 0),
      contagemPorTabela: contagem,
      // Presente e vazio quando deu tudo certo. Se tiver qualquer coisa aqui,
      // o arquivo NÃO é um backup completo.
      falhas,
      completo: Object.keys(falhas).length === 0,
      // Os arquivos de anexo vivem no Storage, fora do banco: este JSON guarda
      // a referência, não o arquivo em si. Está escrito aqui para ninguém
      // descobrir isso na hora de restaurar.
      observacao:
        "Anexos e fotos ficam no Storage do Supabase; este arquivo guarda apenas as referências, não os arquivos.",
    },
    dados,
  };

  const nome = `faro-backup-${geradoEm.slice(0, 19).replace(/[:T]/g, "-")}.json`;
  return new NextResponse(JSON.stringify(arquivo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
