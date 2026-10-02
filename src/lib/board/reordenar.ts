/**
 * A nova ordem de uma lista depois de arrastar um item sobre outro.
 *
 * Existe num lugar só porque a conta é a mesma na fila de leitura (Livros) e nos
 * checklists, e porque é o tipo de laço onde o erro de um índice passa
 * desapercebido: tirar o item da lista ANTES de inserir desloca tudo o que vem
 * depois, então calcular o destino na lista original e inserir na lista já
 * encurtada é justamente o detalhe que costuma sair errado.
 *
 * Devolve a MESMA lista quando nada muda de lugar — quem chama usa isso pra não
 * gravar no banco à toa.
 */
export function listaReordenada(
  ids: string[],
  arrastadoId: string | null,
  sobreId: string | null
): string[] {
  if (!arrastadoId) return ids;
  const de = ids.indexOf(arrastadoId);
  if (de === -1) return ids;

  // Soltar fora de qualquer item (sobreId nulo ou desconhecido) manda pro fim:
  // é o gesto de "tira isso daqui de cima".
  let para = sobreId ? ids.indexOf(sobreId) : ids.length - 1;
  if (para === -1) para = ids.length - 1;
  if (de === para) return ids;

  const novos = [...ids];
  novos.splice(de, 1);
  novos.splice(para, 0, arrastadoId);
  return novos;
}
