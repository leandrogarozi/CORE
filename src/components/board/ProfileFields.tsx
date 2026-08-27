"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { UserIcon } from "./icons";
import type { UseBoard } from "@/lib/board/use-board";

const BRAZIL_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Campo_Grande",
  "America/Cuiaba",
  "America/Boa_Vista",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Maceio",
  "America/Araguaina",
  "America/Santarem",
  "America/Eirunepe",
  "America/Noronha",
];

function useTimezoneOptions(): { brazil: string[]; others: string[] } {
  return useMemo(() => {
    let all: string[];
    try {
      all = Intl.supportedValuesOf("timeZone");
    } catch {
      all = [...BRAZIL_TIMEZONES, "UTC"];
    }
    const brazilSet = new Set(BRAZIL_TIMEZONES);
    return {
      brazil: BRAZIL_TIMEZONES.filter((tz) => all.includes(tz)),
      others: all.filter((tz) => !brazilSet.has(tz)),
    };
  }, []);
}

export function AvatarUploader({ avatarUrl, board }: { avatarUrl: string | null; board: UseBoard }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const err = await board.uploadAvatar(file);
    setUploading(false);
    if (err) setError(err);
  }

  return (
    <div className="profile-avatar-row">
      <button
        type="button"
        className="profile-avatar-btn"
        onClick={() => inputRef.current?.click()}
        title="Trocar foto"
        disabled={uploading}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill sizes="72px" className="profile-avatar-img" />
        ) : (
          <UserIcon />
        )}
      </button>
      <div className="profile-avatar-info">
        <span className="settings-label">Foto</span>
        <span className="settings-toggle-hint">{uploading ? "Enviando..." : "Clique na foto pra trocar"}</span>
        {error && <span className="profile-avatar-error">{error}</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

export function ProfileFields({ board }: { board: UseBoard }) {
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const { brazil: brazilTimezones, others: otherTimezones } = useTimezoneOptions();

  return (
    <>
      <AvatarUploader avatarUrl={board.state.settings.avatarUrl} board={board} />
      <div className="settings-rows">
        <div className="settings-row-standalone">
          <span className="settings-label">Como quer ser chamado?</span>
          <input
            type="text"
            placeholder="Leandro"
            className="budget-input profile-name-input"
            value={nameInput ?? board.state.settings.preferredName ?? ""}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={() => {
              if (nameInput === null) return;
              const trimmed = nameInput.trim();
              if (trimmed !== (board.state.settings.preferredName ?? "")) {
                board.updateSettings({ preferredName: trimmed || null });
              }
              setNameInput(null);
            }}
          />
        </div>
        <div className="settings-row-standalone">
          <span className="settings-label">Data de nascimento</span>
          <input
            type="date"
            className="budget-input"
            value={board.state.settings.birthDate ?? ""}
            onChange={(e) => board.updateSettings({ birthDate: e.target.value || null })}
          />
        </div>
      </div>
      <div className="settings-toggle-hint" style={{ marginTop: 6 }}>
        Usado pra deixar o app (e o FARO, no futuro) mais pessoal — chamar você pelo nome certo.
      </div>

      <div className="settings-rows" style={{ marginTop: 16 }}>
        <div className="settings-row-standalone">
          <span className="settings-label">WhatsApp/telefone</span>
          <input
            type="tel"
            placeholder="+55 11 91234-5678"
            className="budget-input profile-name-input"
            value={phoneInput ?? board.state.settings.notifyPhone ?? ""}
            onChange={(e) => setPhoneInput(e.target.value)}
            onBlur={() => {
              if (phoneInput === null) return;
              const trimmed = phoneInput.trim();
              if (trimmed !== (board.state.settings.notifyPhone ?? "")) {
                board.updateSettings({ notifyPhone: trimmed || null });
              }
              setPhoneInput(null);
            }}
          />
        </div>
        <div className="settings-row-standalone">
          <span className="settings-label">Fuso horário</span>
          <select
            className="budget-input profile-name-input"
            value={board.state.settings.timezone ?? ""}
            onChange={(e) => board.updateSettings({ timezone: e.target.value || null })}
          >
            <option value="">Detectar do navegador</option>
            <optgroup label="Brasil">
              {brazilTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("America/", "").replaceAll("_", " ")}
                </option>
              ))}
            </optgroup>
            <optgroup label="Outros fusos">
              {otherTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>
      <div className="settings-toggle-hint" style={{ marginTop: 6 }}>
        Pra onde mandar notificações no futuro (WhatsApp) e pra lembretes/remédios dispararem na hora certa se
        você viajar. Ainda não está conectado a nenhuma notificação de verdade.
      </div>
    </>
  );
}
