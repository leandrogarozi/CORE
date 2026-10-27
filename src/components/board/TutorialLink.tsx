"use client";

/**
 * O "?" discreto no canto de cima de cada tela: abre o Tutorial já na parte daquela tela.
 * Avisa o BoardApp por um evento do navegador, para a tela não precisar saber de navegação.
 */
export function TutorialLink({ secao }: { secao: string }) {
  return (
    <button
      type="button"
      className="tutorial-link"
      title="Abrir o tutorial desta tela"
      onClick={() => window.dispatchEvent(new CustomEvent("faro:tutorial", { detail: secao }))}
    >
      <span className="tutorial-link-bola" aria-hidden="true">
        ?
      </span>
      Como funciona
    </button>
  );
}
