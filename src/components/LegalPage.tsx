import Link from "next/link";
import type { ReactNode } from "react";

/** Moldura das páginas públicas de Termos e Privacidade (abertas sem login). */
export function LegalPage({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: ReactNode }) {
  return (
    <main className="legal-wrap">
      <article className="legal-card">
        <Link href="/login" className="legal-voltar">
          ← FARO
        </Link>
        <h1 className="legal-titulo">{titulo}</h1>
        <p className="legal-meta">Atualizado em {atualizado}</p>
        <p className="legal-rascunho">
          Versão preliminar, ainda em revisão jurídica. Pode mudar antes da abertura do FARO a outras pessoas.
        </p>
        {children}
        <nav className="legal-rodape" aria-label="Outras páginas">
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Política de privacidade</Link>
        </nav>
      </article>
    </main>
  );
}
