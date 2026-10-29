"use client";

import { SendIcon } from "./icons";

/**
 * O botão redondo de "enviar" ao lado de um campo de adicionar. No celular o Enter do teclado nem sempre
 * aparece (ou é difícil de achar), então todo campo que cria algo ao apertar Enter ganha este botão.
 */
export function EnviarBtn({ onClick, label = "Adicionar" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="quickadd-enviar"
      aria-label={label}
      title={label}
      // Sem isto o toque tira o foco do campo antes de enviar e o teclado do celular fecha no meio.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <SendIcon />
    </button>
  );
}
