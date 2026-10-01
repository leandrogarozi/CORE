"use client";

import { useBoardCtx } from "./board-context";
import { ProfileFields } from "./ProfileFields";

export function ProfileView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Perfil</span>
        <span style={{ width: 32 }} />
      </div>

      {/* Aqui são só dois blocos. Em duas colunas eles ficavam lado a lado numa
          tela de 1180px, e o vazio ao redor fazia parecer que faltava coisa.
          Empilhados numa coluna estreita, a mesma informação parece inteira. */}
      <div className="narrow-list">
        <div className="dash-box">
          <div className="dash-box-title">Seus dados</div>
          <ProfileFields board={board} />
        </div>

        <div className="dash-box profile-signout-box">
          <div className="dash-box-title">Sessão</div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="signout-btn">
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
