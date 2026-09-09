"use client";

import { useDictation } from "@/lib/board/use-dictation";
import { MicIcon } from "./icons";

// Botão de ditar. Some sozinho quando o navegador não tem reconhecimento de
// voz — melhor não existir do que existir quebrado; nesses casos o microfone
// do teclado do celular escreve no campo do mesmo jeito.
export function MicButton({
  onText,
  ariaLabel = "Ditar por voz",
  className = "icon-btn",
}: {
  onText: (text: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const { supported, listening, partial, error, toggle } = useDictation({ onText });

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        className={className + " mic-btn" + (listening ? " listening" : "")}
        title={listening ? "Parar de ditar" : "Ditar por voz"}
        aria-label={ariaLabel}
        aria-pressed={listening}
        // Sem isso, clicar no microfone tira o foco do campo — e nos campos de
        // "+ adicionar", que salvam ao perder o foco, isso criaria o item antes
        // da pessoa falar.
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        <MicIcon />
      </button>
      {listening && (
        <span className="mic-live" role="status">
          <span className="mic-dot" />
          {partial ? <span className="mic-partial">{partial}</span> : "Ouvindo..."}
        </span>
      )}
      {error && <span className="mic-error">{error}</span>}
    </>
  );
}
