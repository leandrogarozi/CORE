import { stripHtml } from "@/lib/rich-text";

/**
 * O aviso que a caixa Avisos (sininho da home) recebe junto com o push de um
 * lembrete de manutenção. O push some da tela do celular; o aviso fica na cara
 * dele até ser lido, e leva para a Manutenção, onde se marca "Feito".
 *
 * O texto do lembrete já diz o momento ("Hoje vence: …", "Venceu há 1 dia…"),
 * então ele vira o título. A anotação do item é texto rico (vem com <p>…</p>):
 * aqui vai só o texto. O corpo muda conforme o momento: nos de cobrança
 * (vencido) a pergunta é "já fez?".
 */
export function avisoDaManutencao(lembrete: { title: string; source_stage: string | null }): {
  titulo: string;
  corpo: string;
  destino: string;
} {
  const etapa = lembrete.source_stage ?? "";
  const corpo = etapa.startsWith("vencido")
    ? "Você já fez? Se sim, abra a Manutenção e marque como feito. Se não, o FARO insiste de novo daqui a alguns dias."
    : etapa === "comprar"
      ? "Hora de comprar. Quando comprar, marque “Comprei” na Manutenção."
      : "Quando fizer, abra a Manutenção e marque como feito.";
  return { titulo: stripHtml(lembrete.title), corpo, destino: "manutencao" };
}
