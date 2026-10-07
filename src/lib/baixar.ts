/**
 * Baixa um texto como arquivo (ex.: uma sinapse em .md). O nome vai sem acento:
 * no Chromium um único caractere fora do ASCII no atributo `download` faz o
 * navegador jogar o nome fora e salvar como "download" (ver learning-export).
 */
export function baixarTexto(nome: string, conteudo: string, tipo = "text/markdown;charset=utf-8") {
  const seguro =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7E]/g, "-")
      .replace(/[\/\\:*?"<>|]/g, "-")
      .replace(/-{2,}/g, "-")
      .trim() || "arquivo.md";
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = seguro;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Nome do arquivo sem a pasta da área ("Sinapses/Seja água.md" -> "Seja água.md"). */
export function soONome(caminho: string): string {
  return caminho.split("/").pop() || caminho;
}
