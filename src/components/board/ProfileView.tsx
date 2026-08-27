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
        <span style={{ width: 30 }} />
      </div>

      <div className="dash-box">
        <ProfileFields board={board} />
      </div>
    </div>
  );
}
