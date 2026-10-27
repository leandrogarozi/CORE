"use client";

import { useRef, useState } from "react";
import { CalendarCheckIcon } from "./icons";

/** "2026-10-27" -> "27/10/2026" */
function paraTexto(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** "27/10/2026" -> "2026-10-27", ou null se não for uma data de verdade (30/02 não passa). */
function paraISO(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(a, mes - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== d) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Põe as barras sozinho enquanto a pessoa digita só os números. */
function mascara(bruto: string): string {
  const n = bruto.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

interface Props {
  /** Data em ISO ("2026-10-27") ou vazia. */
  value: string | null | undefined;
  /** Chamado com a data em ISO quando o texto digitado é uma data válida, e com "" quando o campo é apagado. */
  onChange: (iso: string) => void;
  className?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Campo de data que mostra dia/mês/ano por inteiro e deixa digitar (só os números, as barras entram sozinhas) ou
 * abrir o calendário. O campo de data do navegador corta o ano em espaços estreitos e, no celular, só abre o
 * calendário.
 */
export function DateField({ value, onChange, className, ariaLabel, autoFocus, onKeyDown }: Props) {
  const nativo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(paraTexto(value));
  const [valorAnterior, setValorAnterior] = useState(value ?? "");
  // Mudança de fora (calendário, outro botão): o texto acompanha.
  if ((value ?? "") !== valorAnterior) {
    setValorAnterior(value ?? "");
    if (paraISO(texto) !== (value ?? "")) setTexto(paraTexto(value));
  }
  const invalido = texto.length === 10 && paraISO(texto) === null;

  function digitou(bruto: string) {
    const t = mascara(bruto);
    setTexto(t);
    if (t === "") onChange("");
    else {
      const iso = paraISO(t);
      if (iso) onChange(iso);
    }
  }

  function abrirCalendario() {
    const el = nativo.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  }

  return (
    <span className="datefield">
      <input
        type="text"
        className={className}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        aria-invalid={invalido}
        value={texto}
        onChange={(e) => digitou(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button type="button" className="datefield-cal" aria-label="Abrir o calendário" title="Abrir o calendário" onClick={abrirCalendario}>
        <CalendarCheckIcon />
      </button>
      <input
        ref={nativo}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="datefield-nativo"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}
