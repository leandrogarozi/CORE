/**
 * Cadastro de clientes vindo das páginas (LPs) em cadastro.leandrogarozi.com.br.
 *
 * Módulo puro (sem rede e sem banco): valida e normaliza o que a página manda.
 * Tudo que chega aqui veio de um visitante anônimo da internet, então nada é
 * confiado: tamanho, formato e tipo de cada campo são conferidos, e o horário do
 * consentimento NÃO vem da página (quem carimba é o servidor).
 *
 * Este módulo e `src/app/api/cadastro/` formam um pacote isolado: não mexem em
 * nada do resto do FARO, a não ser a ponte opcional `sincronizar.ts`.
 */

export interface CadastroValido {
  produto: string;
  nome: string;
  email: string;
  emailNorm: string;
  whatsapp: string | null; // só dígitos, com 55 na frente (ex.: 5527999998888)
  aniversario: string | null; // AAAA-MM-DD
  respostasExtras: Record<string, string | number | boolean | string[]>;
  origem: string | null;
  textoConsentimento: string | null;
  chave: string | null;
  teste: boolean;
}

export type ResultadoDaValidacao = { ok: true; dados: CadastroValido } | { ok: false; campo: string; erro: string };

const falha = (campo: string, erro: string): ResultadoDaValidacao => ({ ok: false, campo, erro });

const limpar = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

/** Telefone brasileiro em dígitos com DDI. Devolve null se não parecer telefone. */
export function normalizarWhatsapp(bruto: string): string | null {
  let d = bruto.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length === 12 || d.length === 13) return d;
  return null;
}

export function dataISOValida(s: string, hojeISO: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1) return false;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return dia <= ultimo && s <= hojeISO;
}

const LIMITE_RESPOSTAS_CHARS = 6000;

function respostas(bruto: unknown): { ok: true; valor: CadastroValido["respostasExtras"] } | { ok: false } {
  if (bruto === undefined || bruto === null) return { ok: true, valor: {} };
  if (typeof bruto !== "object" || Array.isArray(bruto)) return { ok: false };
  const entradas = Object.entries(bruto as Record<string, unknown>);
  if (entradas.length > 20) return { ok: false };
  const saida: CadastroValido["respostasExtras"] = {};
  for (const [k, v] of entradas) {
    const chave = limpar(k).slice(0, 60);
    if (!chave) return { ok: false };
    if (typeof v === "string") saida[chave] = limpar(v).slice(0, 1000);
    else if (typeof v === "number" && Number.isFinite(v)) saida[chave] = v;
    else if (typeof v === "boolean") saida[chave] = v;
    else if (Array.isArray(v) && v.length <= 20 && v.every((x) => typeof x === "string")) {
      saida[chave] = (v as string[]).map((x) => limpar(x).slice(0, 200));
    } else return { ok: false };
  }
  if (JSON.stringify(saida).length > LIMITE_RESPOSTAS_CHARS) return { ok: false };
  return { ok: true, valor: saida };
}

export function validarCadastro(corpo: unknown, hojeISO: string): ResultadoDaValidacao {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return falha("corpo", "Envie um JSON com os campos do cadastro.");
  const c = corpo as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === "string" ? limpar(v) : "");

  const produto = texto(c.produto).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(produto)) return falha("produto", "Produto inválido (use letras minúsculas, números, - ou _).");

  const nome = texto(c.nome);
  if (nome.length < 2 || nome.length > 120) return falha("nome", "Informe o nome (2 a 120 letras).");

  const email = texto(c.email).toLowerCase();
  // Conjunto de caracteres fechado de propósito: o e-mail entra em filtros de banco e não pode carregar vírgula, parêntese ou aspas.
  if (email.length > 254 || !/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email)) return falha("email", "E-mail inválido.");

  if (c.consentimento !== true) return falha("consentimento", "É preciso aceitar receber contato para concluir o cadastro.");

  let whatsapp: string | null = null;
  const zap = texto(c.whatsapp);
  if (zap) {
    whatsapp = normalizarWhatsapp(zap);
    if (!whatsapp) return falha("whatsapp", "WhatsApp inválido (use DDD + número).");
  }

  let aniversario: string | null = null;
  const nasc = texto(c.aniversario);
  if (nasc) {
    if (!dataISOValida(nasc, hojeISO)) return falha("aniversario", "Data de aniversário inválida (use AAAA-MM-DD).");
    aniversario = nasc;
  }

  const extras = respostas(c.respostas_extras);
  if (!extras.ok) return falha("respostas_extras", "Respostas extras inválidas ou grandes demais.");

  const origem = texto(c.origem).slice(0, 120) || null;
  const textoConsentimento = texto(c.texto_consentimento).slice(0, 600) || null;
  const chave = texto(c.chave).slice(0, 80) || null;

  return {
    ok: true,
    dados: {
      produto,
      nome,
      email,
      emailNorm: email,
      whatsapp,
      aniversario,
      respostasExtras: extras.valor,
      origem,
      textoConsentimento,
      chave,
      teste: c.teste === true,
    },
  };
}

/** Origens que podem chamar o endpoint pelo navegador. */
export const ORIGENS_PERMITIDAS = ["https://cadastro.leandrogarozi.com.br"];

export function origemPermitida(origem: string | null): boolean {
  return !origem || ORIGENS_PERMITIDAS.includes(origem);
}
