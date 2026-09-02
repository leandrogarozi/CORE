// Converte HTML (do editor rico) pra texto puro — usado em previews/tooltips
// onde formatação não se aplica (título de botão, linha de lista compacta, etc.).
export function stripHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

export function isRichTextEmpty(html: string | null | undefined): boolean {
  return !html || stripHtml(html).length === 0;
}

// Conta quantos itens de checklist (bloco "tarefa" do editor rico) ainda estão
// desmarcados — usado pra saber se uma reunião concluída deixou pauta em aberto.
export function countOpenChecklistItems(html: string | null | undefined): number {
  if (!html) return 0;
  const matches = html.match(/data-checked="false"/g);
  return matches ? matches.length : 0;
}
