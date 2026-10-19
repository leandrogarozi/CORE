"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TrashIcon } from "./icons";

/**
 * Confirmação com a senha do login, para apagar o que não volta (link de cadastro, cliente).
 * Quem usa passa `onConfirmar(senha)`: a conferência da senha acontece no servidor, e a
 * resposta diz se deu certo ou o que mostrar ("Senha incorreta.").
 */
export function ConfirmarComSenha({
  titulo,
  children,
  botao,
  onCancelar,
  onConfirmar,
}: {
  titulo: string;
  children: ReactNode;
  botao: string;
  onCancelar: () => void;
  onConfirmar: (senha: string) => Promise<{ ok: boolean; erro?: string }>;
}) {
  const [senha, setSenha] = useState("");
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    if (!senha || trabalhando) return;
    setTrabalhando(true);
    setErro(null);
    const r = await onConfirmar(senha);
    // Deu certo: quem chamou fecha a janela (o item some da tela).
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível apagar agora.");
      setTrabalhando(false);
    }
  }

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onCancelar} />
      <div className="modal-panel" role="dialog" aria-label={titulo}>
        <div className="modal-title">
          <span className="modal-title-icon">
            <TrashIcon />
          </span>
          {titulo}
        </div>
        <div className="scope-question">
          {children} Para confirmar, digite a senha do seu login no FARO.
        </div>
        <input
          type="password"
          className="fm-senha"
          autoFocus
          autoComplete="current-password"
          placeholder="Senha"
          aria-label="Senha do FARO"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void confirmar()}
        />
        {erro && <div className="mic-error">{erro}</div>}
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" disabled={!senha || trabalhando} onClick={() => void confirmar()}>
            {trabalhando ? "Conferindo…" : botao}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
