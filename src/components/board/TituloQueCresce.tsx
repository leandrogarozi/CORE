"use client";

import { useEffect, useRef } from "react";

/**
 * Campo de título de uma linha que cresce com o texto e quebra em várias linhas (no celular o nome não fica cortado).
 * Enter confirma (sai do campo) em vez de quebrar a linha.
 */
export function TituloQueCresce({
  value,
  onChange,
  onBlur,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={(className ?? "") + " titulo-cresce"}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
