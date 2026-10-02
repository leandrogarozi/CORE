import { htmlParaMarkdown, temConteudo } from "@/lib/html-para-markdown";

/**
 * Transforma o que está guardado no FARO em arquivos de texto legíveis.
 *
 * Por que texto e não o JSON de `/api/backup/export`: aquele é cofre, serve pra
 * restaurar o app. Este é biblioteca — ele pediu *"para sempre ficar guardado
 * para a pessoa ali ter como pegar aqueles arquivos de forma fácil"*. Pegar
 * fácil é abrir no celular e ler sem o FARO existir.
 *
 * Markdown: abre como texto puro em qualquer lugar E importa formatado no Google
 * Docs ou no Word. Não custa nada e serve os dois.
 *
 * O APP NÃO ESCREVE NO DRIVE DE NINGUÉM. O arquivo é baixado e a pessoa guarda
 * onde quiser. Essa decisão é o que torna o recurso seguro pra terceiros: sem
 * token de Google de cliente no banco, sem verificação do Google, e sem risco de
 * atropelar a organização que a pessoa já tem. (O arquivamento do Leandro segue
 * por fora, pela Regra 19 da skill do Drive — este recurso não toca nele.)
 *
 * Módulo puro: sem rede, sem env, sem banco. É o que deixa conferir o conteúdo
 * dos arquivos em teste, sem navegador e sem credencial.
 */

export interface ArquivoDeAprendizado {
  /** Caminho dentro do zip, com a subpasta da área. */
  nome: string;
  conteudo: string;
}

export interface LivroParaExportar {
  title: string;
  insights: string | null;
  /** O status cru do banco ("finalizado"). Quem traduz é o `rotuloDoStatus`. */
  status?: string | null;
}

/**
 * "finalizado" é nome de coluna, não é o que a pessoa lê na tela. O arquivo é
 * pra ela, então vai o rótulo que ela conhece.
 */
const ROTULO_DO_STATUS: Record<string, string> = {
  para_ler: "Para ler",
  lendo: "Em leitura",
  finalizado: "Concluído",
};
const rotuloDoStatus = (s: string | null | undefined) =>
  s?.trim() ? ROTULO_DO_STATUS[s.trim()] ?? s.trim() : null;

export interface SinapseParaExportar {
  title: string;
  learning: string | null;
  questions: string | null;
  source: string | null;
  createdAt?: string | null;
}

/**
 * As áreas que a pessoa escolhe nas Configurações.
 *
 * Lista explícita, e é aqui que ferramenta nova entra — ele já avisou que vem
 * mais (*"se tiver outras ferramentas a gente acrescenta lá"*). Área nova é uma
 * entrada aqui mais a função que monta os arquivos dela; a tela se desenha a
 * partir desta lista e não precisa ser mexida.
 */
export const AREAS_DE_BACKUP = [
  { id: "sinapses", rotulo: "Sinapses", pasta: "Sinapses" },
  { id: "livros", rotulo: "Resumos de livro", pasta: "Livros" },
] as const;

export type AreaDeBackup = (typeof AREAS_DE_BACKUP)[number]["id"];
export const AREAS_PADRAO: AreaDeBackup[] = ["sinapses", "livros"];

export function ehAreaDeBackup(v: string): v is AreaDeBackup {
  return AREAS_DE_BACKUP.some((a) => a.id === v);
}

const pastaDaArea = (id: AreaDeBackup) => AREAS_DE_BACKUP.find((a) => a.id === id)!.pasta;

/**
 * Título vira nome de arquivo sem quebrar nada nem ficar ilegível.
 *
 * A barra é o caso que importa: "E/OU" num título criaria subpasta ou falharia.
 * Acento fica — tirar deixaria "Ação" como "Acao", que a pessoa teria que
 * decifrar na lista.
 */
export function nomeDeArquivo(titulo: string, extensao = "md"): string {
  const limpo = titulo
    .trim()
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 80)
    .trim();
  return `${limpo || "sem-titulo"}.${extensao}`;
}

/**
 * Nomes únicos. Dois itens com o mesmo título existem, e o segundo sobrescreveria
 * o primeiro dentro do zip — perder anotação calado é o que um backup não pode
 * fazer.
 */
export function semNomesRepetidos(arquivos: ArquivoDeAprendizado[]): ArquivoDeAprendizado[] {
  const vistos = new Map<string, number>();
  return arquivos.map((a) => {
    const chave = a.nome.toLowerCase();
    const n = vistos.get(chave) ?? 0;
    vistos.set(chave, n + 1);
    if (n === 0) return a;
    const ponto = a.nome.lastIndexOf(".");
    const base = ponto > 0 ? a.nome.slice(0, ponto) : a.nome;
    const ext = ponto > 0 ? a.nome.slice(ponto) : "";
    return { ...a, nome: `${base} (${n + 1})${ext}` };
  });
}

export function arquivoDoLivro(livro: LivroParaExportar): ArquivoDeAprendizado | null {
  // Regra dele, dita duas vezes: *"todo backup nessa situação só deve sair
  // daquilo que tem anotação. Não deve fazer backup de livro que não tem
  // anotação."* A checagem é no HTML convertido, não no campo cru: o editor
  // salva `<p></p>` quando a pessoa abre e fecha sem escrever, e isso não é
  // anotação.
  if (!temConteudo(livro.insights)) return null;
  const partes = [`# ${livro.title.trim()}`, ""];
  const status = rotuloDoStatus(livro.status);
  if (status) partes.push(`**Status:** ${status}`, "");
  partes.push("## O que ficou", "", htmlParaMarkdown(livro.insights), "");
  return { nome: `${pastaDaArea("livros")}/${nomeDeArquivo(livro.title)}`, conteudo: partes.join("\n") };
}

export function arquivoDaSinapse(s: SinapseParaExportar): ArquivoDeAprendizado | null {
  // Sinapse vale se tem aprendizado OU pergunta. Título sozinho é lembrete de
  // escrever, não aprendizado guardado.
  if (!temConteudo(s.learning) && !temConteudo(s.questions)) return null;
  const partes = [`# ${s.title.trim()}`, ""];
  if (s.source?.trim()) partes.push(`**Fonte:** ${s.source.trim()}`, "");
  if (s.createdAt) partes.push(`**Anotado em:** ${s.createdAt.slice(0, 10)}`, "");
  if (temConteudo(s.learning)) partes.push("## Aprendizado", "", htmlParaMarkdown(s.learning), "");
  // A pergunta é a parte que faz a sinapse ser lembrada — não é apêndice.
  if (temConteudo(s.questions)) partes.push("## Perguntas que isso gera", "", htmlParaMarkdown(s.questions), "");
  return { nome: `${pastaDaArea("sinapses")}/${nomeDeArquivo(s.title)}`, conteudo: partes.join("\n") };
}

export interface DadosDoBackup {
  livros: LivroParaExportar[];
  sinapses: SinapseParaExportar[];
}

/**
 * O índice. Dá o mapa do zip e é o único lugar onde aparece o que NÃO virou
 * arquivo — livro na estante ainda sem anotação. A lista de leitura é
 * informação; sumir com ela faria o backup contar menos do que o app sabe.
 */
export function indiceDoBackup(
  dados: DadosDoBackup,
  areas: AreaDeBackup[],
  nomeDoBackup: string,
  geradoEm: string
): ArquivoDeAprendizado {
  const linhas = [`# ${nomeDoBackup.trim() || "Backup do FARO"}`, "", `Gerado em ${geradoEm.slice(0, 10)}.`, ""];

  if (areas.includes("sinapses")) {
    const comTexto = dados.sinapses.filter((s) => temConteudo(s.learning) || temConteudo(s.questions));
    linhas.push(`## Sinapses (${comTexto.length})`, "");
    if (!comTexto.length) linhas.push("_Nenhuma sinapse com texto ainda._", "");
    for (const s of comTexto) linhas.push(`- ${s.title.trim()}`);
    linhas.push("");
  }

  if (areas.includes("livros")) {
    const comNota = dados.livros.filter((l) => temConteudo(l.insights));
    const semNota = dados.livros.filter((l) => !temConteudo(l.insights));
    linhas.push(`## Resumos de livro (${comNota.length})`, "");
    if (!comNota.length) linhas.push("_Nenhum livro com anotação ainda._", "");
    for (const l of comNota) linhas.push(`- ${l.title.trim()}`);
    linhas.push("");
    if (semNota.length) {
      linhas.push(
        `## Estante — sem anotação (${semNota.length})`,
        "",
        "Estes não têm arquivo próprio porque ainda não têm nada escrito.",
        ""
      );
      for (const l of semNota) {
        const st = rotuloDoStatus(l.status);
        linhas.push(`- ${l.title.trim()}${st ? ` — ${st}` : ""}`);
      }
      linhas.push("");
    }
  }

  return { nome: "00 — Índice.md", conteudo: linhas.join("\n") };
}

/** Tudo que vai pro zip, nas áreas escolhidas. */
export function arquivosDoBackup(
  dados: DadosDoBackup,
  areas: AreaDeBackup[],
  nomeDoBackup: string,
  geradoEm: string
): ArquivoDeAprendizado[] {
  const arquivos: ArquivoDeAprendizado[] = [indiceDoBackup(dados, areas, nomeDoBackup, geradoEm)];
  if (areas.includes("sinapses")) {
    for (const s of dados.sinapses) {
      const a = arquivoDaSinapse(s);
      if (a) arquivos.push(a);
    }
  }
  if (areas.includes("livros")) {
    for (const l of dados.livros) {
      const a = arquivoDoLivro(l);
      if (a) arquivos.push(a);
    }
  }
  return semNomesRepetidos(arquivos);
}

/** Quantos arquivos sairiam — pra tela dizer isso ANTES de gerar. */
export function quantosArquivos(dados: DadosDoBackup, areas: AreaDeBackup[]): number {
  return arquivosDoBackup(dados, areas, "x", "2026-01-01").length;
}

/**
 * Nome do .zip — SÓ ASCII, e isso não é preciosismo.
 *
 * Medido no Chromium: um único caractere fora do ASCII no atributo `download`
 * faz o navegador DESCARTAR o nome inteiro e salvar como "download", sem
 * extensão. Vale pra acento ("família"), pra travessão e pro ponto médio. Num
 * app em português, com o nome escrito pelo usuário, isso aconteceria quase
 * sempre.
 *
 * Só o nome do .zip tem essa restrição. Os arquivos DENTRO dele mantêm acento
 * normalmente, porque ali o nome é uma entrada do zip (UTF-8), não um atributo
 * de HTML — "Seja água.md" abre certo, e é o nome que ele reconhece.
 */
function soAscii(texto: string): string {
  return (
    texto
      // Separa o acento da letra e joga o acento fora: "ção" -> "cao", em vez de
      // virar "-" e deixar o nome ilegível.
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // O que sobrou fora do ASCII imprimível vira hífen.
      .replace(/[^\x20-\x7E]/g, "-")
      .replace(/-{2,}/g, "-")
  );
}

/** Nome do .zip. Data na frente pra ordenar sozinho na pasta de downloads. */
export function nomeDoZip(nomeDoBackup: string, geradoEm: string): string {
  const base =
    soAscii(nomeDoBackup.trim())
      .replace(/[\/\\:*?"<>|]/g, "-")
      .replace(/^[.\s-]+|[.\s-]+$/g, "")
      .slice(0, 60)
      .trim() || "Backup FARO";
  // Hífen simples, não travessão: o travessão é justamente um dos que o
  // navegador rejeita.
  return `${geradoEm.slice(0, 10)} - ${base}.zip`;
}
