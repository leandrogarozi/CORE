// Ponte simples (fora do React) entre chamadas ao Supabase que falham em background
// (fire-and-forget, sem await na UI) e um aviso visível pro usuário. Antes disso, um
// erro de salvamento só ia pro console do navegador — o usuário nunca via nada, e o
// item sumia silenciosamente no próximo refresh (foi assim que perdemos 3 lançamentos
// em 03/09 por causa de uma constraint desatualizada no banco).
export type SaveErrorListener = (message: string) => void;

const listeners = new Set<SaveErrorListener>();

export function onSaveError(listener: SaveErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportSaveError(action: string, error: { message?: string } | null | undefined) {
  if (!error) return;
  console.error(action, error);
  const message = `Não foi possível salvar (${action}): ${error.message ?? "erro desconhecido"}`;
  listeners.forEach((l) => l(message));
}
