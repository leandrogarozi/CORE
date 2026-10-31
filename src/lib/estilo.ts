/**
 * Estilo visual dos cartões (flutuante, suave, clássico). Vale só neste aparelho.
 * A chave é "v2" de propósito: valores antigos guardados quando o padrão era outro (ou por engano) são ignorados,
 * e todo aparelho começa no Cartão flutuante. Só uma escolha feita depois disso, em Configurações, muda o estilo.
 * A escolha vai para o armazenamento do navegador e também para um cookie (alguns navegadores do celular apagam um e mantêm o outro).
 */
export const CHAVE_DO_ESTILO = "faro-estilo-v2";
export type EstiloVisual = "flutuante" | "suave" | "classico";

export function lerEstiloGuardado(): EstiloVisual {
  let valor: string | null = null;
  try {
    valor = window.localStorage.getItem(CHAVE_DO_ESTILO);
  } catch {
    // Sem armazenamento: tenta o cookie.
  }
  if (!valor) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + CHAVE_DO_ESTILO + "=([^;]+)"));
    valor = m ? m[1] : null;
  }
  return valor === "suave" || valor === "classico" ? valor : "flutuante";
}

export function guardarEstilo(id: string) {
  try {
    window.localStorage.setItem(CHAVE_DO_ESTILO, id);
  } catch {
    // Vale pelo cookie.
  }
  try {
    document.cookie = CHAVE_DO_ESTILO + "=" + id + "; max-age=31536000; path=/; samesite=lax";
  } catch {
    // Vale só até recarregar.
  }
}
