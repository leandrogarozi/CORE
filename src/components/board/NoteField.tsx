"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RichTextEditor } from "./RichTextEditor";
import { CommentModal } from "./CommentButton";
import { ChevronIcon, ExpandIcon } from "./icons";

// Mesma altura do .note-field-box.collapsed no CSS.
const COLLAPSED_HEIGHT = 150;

// Campo de observação que se escreve direto ali, sem abrir pop-up: a barra de
// formatação aparece só quando o campo tem foco, e o ícone de expandir no canto
// abre a caixa grande pra quem quiser escrever com mais espaço.
export function NoteField({
  value,
  placeholder,
  ariaLabel,
  onChange,
  onPersist,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  // Sobe a cada tecla, pra quem está usando o campo enxergar o valor atual.
  onChange: (html: string) => void;
  // Grava no banco — com atraso, pra não escrever a cada tecla digitada.
  onPersist: (html: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const latest = useRef(value);
  const persistRef = useRef(onPersist);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    persistRef.current = onPersist;
  }, [onPersist]);

  // Se sair da tela com algo pendente, grava antes de desmontar.
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        persistRef.current(latest.current);
      }
    },
    []
  );

  // "Exibir mais" só faz sentido se o texto realmente não cabe recolhido. Mede o
  // conteúdo (que nunca é limitado), não a caixa — que muda de altura ao abrir.
  useLayoutEffect(() => {
    const inner = boxRef.current?.firstElementChild as HTMLElement | null;
    if (!inner) return;
    setOverflowing(inner.scrollHeight > COLLAPSED_HEIGHT + 2);
  }, [value, showAll, focused]);

  function handleChange(html: string) {
    latest.current = html;
    onChange(html);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      persistRef.current(html);
    }, 1200);
  }

  function flush() {
    if (!timer.current) return;
    window.clearTimeout(timer.current);
    timer.current = null;
    persistRef.current(latest.current);
  }

  // Enquanto está escrevendo o campo fica inteiro à mostra; recolhido é só o
  // estado de leitura, pra não empurrar o resto do formulário pra baixo.
  const collapsed = !focused && !showAll;

  return (
    <div
      className="note-field"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setFocused(false);
        flush();
      }}
    >
      <div
        ref={boxRef}
        className={"note-field-box" + (collapsed ? " collapsed" : "") + (collapsed && overflowing ? " faded" : "")}
      >
        <RichTextEditor
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          hideToolbar={!focused}
        />
      </div>
      <button
        type="button"
        className="icon-btn note-field-expand"
        title="Expandir pra escrever numa caixa maior"
        aria-label={`Expandir ${ariaLabel}`}
        onClick={() => {
          flush();
          setModalOpen(true);
        }}
      >
        <ExpandIcon />
      </button>
      {overflowing && !focused && (
        <button
          type="button"
          className={"note-field-toggle" + (showAll ? " open" : "")}
          onClick={() => setShowAll((v) => !v)}
        >
          <ChevronIcon /> {showAll ? "Exibir menos" : "Exibir mais"}
        </button>
      )}
      {modalOpen && (
        <CommentModal
          initialValue={value}
          placeholder={placeholder}
          title={ariaLabel}
          onSave={(html) => {
            latest.current = html;
            onChange(html);
            persistRef.current(html);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
