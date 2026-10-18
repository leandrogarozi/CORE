"use client";

import type { ReactNode } from "react";

/**
 * Peças de formulário no estilo "limpo e objetivo" do app de briefing do Leandro:
 * seções em cartão, escolha por blocos (com ícone, nome e dica), caixas de marcar
 * grandes e etiquetas pequenas em maiúsculas. Feitas para valer em qualquer tela do
 * FARO que tenha um formulário (começou em Cadastros).
 */

export function SecaoCard({
  titulo,
  dica,
  selo,
  direita,
  tracejado,
  children,
}: {
  titulo?: string;
  dica?: string;
  selo?: string;
  direita?: ReactNode;
  tracejado?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={"fm-card" + (tracejado ? " tracejado" : "")}>
      {(titulo || direita) && (
        <header className="fm-card-cab">
          <div className="fm-card-titulos">
            {titulo && (
              <h3 className="fm-card-titulo">
                {titulo} {selo && <span className="fm-selo">{selo}</span>}
              </h3>
            )}
            {dica && <p className="fm-dica">{dica}</p>}
          </div>
          {direita}
        </header>
      )}
      {children}
    </section>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="fm-etiqueta">{children}</span>;
}

export interface OpcaoDeBloco<T extends string> {
  id: T;
  rotulo: string;
  dica?: string;
  icone?: ReactNode;
}

/** Escolha por blocos: um só marcado, com ícone, nome e dica. */
export function BlocosDeEscolha<T extends string>({
  opcoes,
  valor,
  onChange,
  ariaLabel,
}: {
  opcoes: readonly OpcaoDeBloco<T>[];
  valor: string;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="fm-blocos" role="radiogroup" aria-label={ariaLabel}>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          className={"fm-bloco" + (valor === o.id ? " on" : "")}
          onClick={() => onChange(o.id)}
        >
          {o.icone && <span className="fm-bloco-icone">{o.icone}</span>}
          <span className="fm-bloco-rotulo">{o.rotulo}</span>
          {o.dica && <span className="fm-bloco-dica">{o.dica}</span>}
        </button>
      ))}
    </div>
  );
}

/** Caixa de marcar grande, com texto ao lado. */
export function CaixaDeMarcar({
  marcado,
  onChange,
  disabled,
  children,
}: {
  marcado: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={"fm-marcar" + (disabled ? " desativada" : "")}>
      <input type="checkbox" checked={marcado} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Pílula que liga e desliga (ex.: dados pedidos ao cliente). */
export function PilulaDeMarcar({
  marcado,
  onChange,
  disabled,
  children,
}: {
  marcado: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      disabled={disabled}
      className={"fm-pilula" + (marcado ? " on" : "")}
      onClick={() => !disabled && onChange(!marcado)}
    >
      <span className="fm-pilula-caixa" aria-hidden="true">
        {marcado ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}

const sv = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const IconeTextoCurto = () => (
  <svg {...sv}>
    <path d="M4 8h16M4 12h10" />
  </svg>
);
export const IconeTextoLongo = () => (
  <svg {...sv}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconeLista = () => (
  <svg {...sv}>
    <path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
  </svg>
);
export const IconeLink = () => (
  <svg {...sv}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
export const IconeEstrela = () => (
  <svg {...sv}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
