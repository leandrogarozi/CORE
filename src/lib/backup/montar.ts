import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lista explícita, e não descoberta automática do schema.
 *
 * Descobrir as tabelas sozinho parece mais esperto até o dia em que uma tabela
 * nova entra no backup sem ninguém ter pensado nela — ou, pior, some dele sem
 * ninguém perceber. Escrito na mão, adicionar tabela vira uma decisão
 * consciente, que aparece no diff e é revisada.
 */
export const TABELAS = [
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
  "shopping_items",
  "shopping_lists",
  "knowledge_items",
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

export type Linha = Record<string, unknown>;


/**
 * Lê as tabelas e monta o arquivo de backup.
 *
 * `filtrarUsuario` é para o cliente de serviço (backup automático, sem sessão):
 * ele enxerga tudo, então a leitura filtra pelo dono. Com o cliente do usuário
 * logado o RLS já faz isso e o filtro fica de fora.
 */
export async function montarBackup(supabase: SupabaseClient, usuario: string, filtrarUsuario: boolean) {
  const dados: Record<string, Linha[]> = {};
  const contagem: Record<string, number> = {};
  const falhas: Record<string, string> = {};

  for (const tabela of TABELAS) {
    const linhas: Linha[] = [];
    let de = 0;
    for (;;) {
      let consulta = supabase.from(tabela).select("*");
      if (filtrarUsuario) consulta = consulta.eq("user_id", usuario);
      const { data, error } = await consulta.range(de, de + PAGINA - 1);
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
  const totalLinhas = Object.values(contagem).reduce((a, b) => a + b, 0);
  const arquivo = {
    // O manifesto é o que permite conferir o backup sem abrir os dados: dá pra
    // olhar a contagem e saber na hora se o arquivo está gordo ou magro demais.
    manifesto: {
      app: "FARO",
      formato: 1,
      geradoEm,
      usuario,
      tabelas: TABELAS.length,
      totalLinhas,
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
  return { arquivo, nome, totalLinhas, completo: Object.keys(falhas).length === 0 };
}
