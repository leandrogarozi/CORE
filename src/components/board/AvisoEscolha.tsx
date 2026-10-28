"use client";

import { BellIcon, WhatsAppIcon } from "./icons";

export type CanalDeAviso = "push" | "whatsapp" | "ambos";

/** De como o lembrete guarda (push, WhatsApp) para a escolha única que a pessoa vê. */
export function canalDe(r: { whatsapp?: boolean; push?: boolean } | null | undefined): CanalDeAviso {
  if (!r) return "push";
  const push = r.push !== false;
  if (r.whatsapp && push) return "ambos";
  if (r.whatsapp) return "whatsapp";
  return "push";
}

/** Da escolha para o que o lembrete guarda. */
export function opcoesDoCanal(c: CanalDeAviso): { whatsapp: boolean; push: boolean } {
  return { whatsapp: c !== "push", push: c !== "whatsapp" };
}

/**
 * "Como avisar": notificação no celular/computador (push), WhatsApp ou os dois. O aviso dentro do app (sininho)
 * continua ligado de qualquer jeito.
 */
export function AvisoEscolha({ valor, onChange }: { valor: CanalDeAviso; onChange: (c: CanalDeAviso) => void }) {
  const opcoes: { v: CanalDeAviso; rotulo: string; icone: React.ReactNode }[] = [
    { v: "push", rotulo: "Push", icone: <BellIcon /> },
    { v: "whatsapp", rotulo: "WhatsApp", icone: <WhatsAppIcon filled={valor === "whatsapp"} /> },
    { v: "ambos", rotulo: "Os dois", icone: <WhatsAppIcon filled={valor === "ambos"} /> },
  ];
  return (
    <div className="aviso-escolha" role="radiogroup" aria-label="Como avisar">
      {opcoes.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={valor === o.v} className={"aviso-escolha-op" + (valor === o.v ? " ativo" : "")} onClick={() => onChange(o.v)}>
          {o.icone}
          <span>{o.rotulo}</span>
        </button>
      ))}
    </div>
  );
}
