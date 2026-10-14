/**
 * Identifica ESTA tela (aba/janela) nas escritas no banco. Cada abertura gera um
 * id novo, então dois computadores, ou duas abas, nunca se confundem.
 *
 * O id viaja no cabeçalho `x-faro-device` de toda chamada ao Supabase; um gatilho
 * no banco anota "esse dispositivo escreveu agora". É isso que deixa a tela
 * perceber que outro computador mexeu nos dados e avisar que está desatualizada.
 */
function gerarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const ID_DESTA_TELA: string = gerarId();
