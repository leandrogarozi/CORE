/**
 * O degradê do fundo, escolhido por ele nas Configurações.
 *
 * Isto é só cálculo — não fala com React nem com o banco —, então roda isolado
 * em Node e dá pra testar o que importa: que a cor escolhida é a cor que sai, e
 * que o escuro nunca passa do ponto em que o degradê vira névoa cinza.
 */

export type IntensidadeDoFundo = 0 | 1 | 2 | 3;

export type TomDoFundo = {
  id: string;
  rotulo: string;
  /** A cor principal: a faixa do topo e a mancha da direita saem dela. */
  base: [number, number, number];
  /** O respiro de baixo à esquerda, que impede a página de terminar branca. */
  apoio: [number, number, number];
};

/**
 * Tons escolhidos, não seletor livre de cor.
 *
 * Um seletor aberto deixa escolher um verde-limão forte, e aí o fundo briga com
 * o roxo dos botões e das barras. Estes conversam com a paleta do app; a
 * liberdade que ele ganha é a que importa, sem a de estragar.
 */
/** O id do "Sem cor": fundo liso, branco no claro e preto no escuro. */
export const SEM_COR = "nenhum";

export const TONS_DO_FUNDO: TomDoFundo[] = [
  // Primeiro da lista: "sem cor" é uma decisão de COR, e é lá que ele foi
  // procurar. As bases aqui não são usadas — o degradê sai `none`.
  { id: SEM_COR, rotulo: "Sem cor", base: [255, 255, 255], apoio: [255, 255, 255] },
  { id: "roxo", rotulo: "Roxo", base: [74, 71, 213], apoio: [56, 118, 245] },
  { id: "indigo", rotulo: "Índigo", base: [49, 68, 190], apoio: [38, 140, 230] },
  { id: "azul", rotulo: "Azul", base: [36, 110, 220], apoio: [30, 170, 210] },
  { id: "verde", rotulo: "Verde-água", base: [24, 140, 140], apoio: [40, 160, 110] },
  { id: "ambar", rotulo: "Âmbar", base: [200, 130, 40], apoio: [205, 90, 70] },
  { id: "rosa", rotulo: "Rosa", base: [205, 70, 150], apoio: [150, 80, 220] },
  { id: "cinza", rotulo: "Cinza", base: [100, 105, 125], apoio: [90, 100, 130] },
];

export const TOM_PADRAO = "roxo";
export const INTENSIDADE_PADRAO: IntensidadeDoFundo = 3;

/**
 * Os graus que a tela oferece. O 0 continua existindo no tipo porque linha
 * salva antes pode ter esse valor — e ele significa a mesma coisa que "Sem
 * cor". Oferecer os dois seria dois controles pra uma decisão só, que foi
 * exatamente o que ele estranhou ao procurar "sem cor" entre as cores.
 */
export const GRAUS_NA_TELA: IntensidadeDoFundo[] = [1, 2, 3];

export const ROTULO_DA_INTENSIDADE: Record<IntensidadeDoFundo, string> = {
  0: "Sem cor",
  1: "Suave",
  2: "Médio",
  3: "Presente",
};

/** Um hex "#RRGGBB" vira os números que o degradê usa. */
function doHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ehCorPersonalizada(id: string | null | undefined): boolean {
  return !!id && doHex(id) !== null;
}

/**
 * A mesma escolha dele vale pros dois temas, mas NÃO com o mesmo número.
 *
 * No claro o degradê clareia e aguenta bem; no escuro ele tinge, e passando de
 * ~12% vira névoa cinza e come o contraste do texto. Guardar "tom + degrau" e
 * deixar cada tema traduzir é o que permite um controle só na tela.
 */
const ALFA_CLARO: Record<IntensidadeDoFundo, number> = { 0: 0, 1: 0.06, 2: 0.11, 3: 0.17 };
const ALFA_ESCURO: Record<IntensidadeDoFundo, number> = { 0: 0, 1: 0.04, 2: 0.07, 3: 0.11 };

export function tomPorId(id: string | null | undefined): TomDoFundo {
  const daLista = TONS_DO_FUNDO.find((t) => t.id === id);
  if (daLista) return daLista;

  // Cor escolhida a dedo por ele, guardada como hex. O respiro de baixo é
  // derivado da própria cor, puxado pro frio: usar a MESMA cor nas três camadas
  // acharia uma chapa só e o movimento sumiria — que é o defeito que a gente
  // passou a sessão inteira corrigindo.
  const rgb = doHex(id ?? "");
  if (rgb) {
    const [r, g, b] = rgb;
    return {
      id: id as string,
      rotulo: "Personalizada",
      base: rgb,
      apoio: [Math.round(r * 0.6), Math.round(g * 0.8), Math.min(255, Math.round(b * 1.15))],
    };
  }
  // Id que não existe mais (tom renomeado, lixo no banco): volta pro padrão.
  // Nunca pro primeiro da lista, que hoje é o "Sem cor" — um id estranho não
  // pode ter o efeito de desligar o fundo dele.
  return TONS_DO_FUNDO.find((t) => t.id === TOM_PADRAO) ?? TONS_DO_FUNDO[0];
}

function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

/**
 * O valor do `--fundo-degrade` pra um tema.
 *
 * Três camadas, na ordem de leitura: uma faixa que atravessa a largura toda no
 * topo e desce sumindo; uma mancha deslocada pra direita, que dá o movimento e
 * impede que a faixa pareça uma listra reta; e o respiro frio embaixo à
 * esquerda. O meio fica limpo de propósito — é onde o conteúdo mora.
 *
 * Intensidade 0 devolve `none`: "Neutro" é sem degradê nenhum, não um degradê
 * fraquinho que ninguém sabe se está lá.
 */
export function degradeDoFundo(
  tom: TomDoFundo,
  intensidade: IntensidadeDoFundo,
  tema: "claro" | "escuro"
): string {
  // "Sem cor" e grau zero são a mesma coisa: fundo liso, branco no claro e
  // preto no escuro.
  if (tom.id === SEM_COR) return "none";
  const alfa = (tema === "claro" ? ALFA_CLARO : ALFA_ESCURO)[intensidade];
  if (alfa === 0) return "none";

  // A mancha da direita sai um pouco mais fechada que a faixa; senão as duas
  // viram uma chapa só e o movimento some.
  const mancha: [number, number, number] = [
    Math.round(tom.base[0] * 0.85),
    Math.round(tom.base[1] * 0.8),
    Math.round(tom.base[2] * 0.95),
  ];

  return [
    `linear-gradient(176deg, ${rgba(tom.base, alfa)} 0%, ${rgba(tom.base, alfa / 2)} 18%, ${rgba(tom.base, 0)} 44%)`,
    `radial-gradient(900px 520px at 86% 1%, ${rgba(mancha, alfa * 0.82)} 0%, ${rgba(mancha, 0)} 58%)`,
    `radial-gradient(780px 500px at 2% 92%, ${rgba(tom.apoio, alfa * 0.65)} 0%, ${rgba(tom.apoio, 0)} 62%)`,
  ].join(",");
}
