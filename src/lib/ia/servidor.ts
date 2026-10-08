import Anthropic from "@anthropic-ai/sdk";
import { MAX_TOKENS_DA_RESPOSTA, type MensagemDaConversa } from "./conversa";
import { MODELO_DA_IA, custoEmUsd, type UsoDeTokens } from "./custo";

/**
 * O miolo da conversa no servidor, separado da rota para poder testar com um
 * "falso Claude" sem gastar um centavo: abre a chamada em fluxo, entrega o texto
 * aos poucos, e quando termina registra quanto custou.
 *
 * Dois cuidados que valem dinheiro:
 *  - o uso só é conhecido no fim da resposta, e é gravado MESMO se a pessoa
 *    fechar a tela no meio (a API cobra do mesmo jeito; sem isso o painel e o
 *    teto subestimariam o gasto);
 *  - erro ANTES do primeiro texto vira resposta HTTP de erro, com código que a
 *    tela entende; erro no meio só corta a conversa.
 */

export type ErroDaIA = "chave_invalida" | "limite_da_api" | "indisponivel";

export interface Gasto {
  modelo: string;
  uso: UsoDeTokens;
  custoUsd: number;
}

export interface PedidoDeConversa {
  anthropic: Pick<Anthropic, "messages">;
  sistema: string;
  mensagens: MensagemDaConversa[];
  registrarGasto: (g: Gasto) => Promise<void>;
}

export type ResultadoDaConversa =
  | { ok: true; corpo: ReadableStream<Uint8Array> }
  | { ok: false; status: number; erro: ErroDaIA };

function classificarErro(e: unknown): { status: number; erro: ErroDaIA } {
  // Vai para o registro da Vercel (nunca para a tela): é por ele que se descobre
  // o motivo de verdade. A mensagem da Anthropic não traz a chave.
  if (e instanceof Anthropic.APIError) console.error("IA: erro da API da Anthropic", e.status, e.message);
  else console.error("IA: erro inesperado", e instanceof Error ? e.message : e);
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return { status: 502, erro: "chave_invalida" };
  }
  if (e instanceof Anthropic.RateLimitError) return { status: 429, erro: "limite_da_api" };
  return { status: 502, erro: "indisponivel" };
}

export function usoDaMensagem(usage: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): UsoDeTokens {
  return {
    entrada: usage.input_tokens ?? 0,
    saida: usage.output_tokens ?? 0,
    cacheLeitura: usage.cache_read_input_tokens ?? 0,
    cacheEscrita: usage.cache_creation_input_tokens ?? 0,
  };
}

export async function iniciarConversa(p: PedidoDeConversa): Promise<ResultadoDaConversa> {
  const stream = p.anthropic.messages.stream({
    model: MODELO_DA_IA,
    max_tokens: MAX_TOKENS_DA_RESPOSTA,
    system: p.sistema,
    messages: p.mensagens,
    // Conversa de rotina não precisa de raciocínio longo: esforço baixo é mais
    // rápido e barato. Sem "thinking": o modelo decide sozinho (adaptativo).
    output_config: { effort: "low" },
  });

  const iterador = stream[Symbol.asyncIterator]();
  let primeiro: IteratorResult<Anthropic.MessageStreamEvent>;
  try {
    primeiro = await iterador.next();
  } catch (e) {
    return { ok: false, ...classificarErro(e) };
  }

  const codificador = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controle) {
      let aberto = true;
      let enviouTexto = false;
      const enviar = (texto: string) => {
        if (!aberto) return;
        try {
          controle.enqueue(codificador.encode(texto));
        } catch {
          aberto = false; // a pessoa fechou a tela: seguimos até o fim só para contar o gasto
        }
      };
      const tratar = (ev: Anthropic.MessageStreamEvent) => {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          enviouTexto = true;
          enviar(ev.delta.text);
        }
      };
      try {
        let atual = primeiro;
        while (!atual.done) {
          tratar(atual.value);
          atual = await iterador.next();
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal" && !enviouTexto) {
          enviar("Não consegui responder a essa. Pode perguntar de outro jeito?");
        } else if (final.stop_reason === "max_tokens") {
          enviar("…");
        }
        const uso = usoDaMensagem(final.usage);
        await p.registrarGasto({ modelo: MODELO_DA_IA, uso, custoUsd: custoEmUsd(MODELO_DA_IA, uso) });
        if (aberto) controle.close();
      } catch (e) {
        if (aberto) controle.error(e);
      }
    },
  });
  return { ok: true, corpo };
}
