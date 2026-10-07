"use client";

import { useEffect, useRef, useState } from "react";
import { useBoardCtx } from "./board-context";
import { SynapseCard } from "./SynapsesView";
import { MicButton } from "./MicButton";
import { BoltIcon, MicIcon } from "./icons";
import { useDictation } from "@/lib/board/use-dictation";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { corpoDaIdeia, tituloDaIdeia } from "@/lib/board/ideias";

// Ideias (insights): teve uma ideia, joga rápido no FARO. Por voz: clica, fala,
// para, e o FARO guarda com um título provisório (a IA refina depois). Ou à mão:
// um título e o texto. Ficam na tabela das sinapses (kind = "ideia"), então
// entram sozinhas no backup de aprendizado e no mapa de aprendizado.
export function IdeasView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [newTitle, setNewTitle] = useState("");
  const [ditado, setDitado] = useState("");
  const ditadoRef = useRef("");
  const guardarAoParar = useRef(false);
  const [guardada, setGuardada] = useState<string | null>(null);

  const { supported, listening, partial, error, start, stop } = useDictation({
    onText: (t) => {
      ditadoRef.current = ditadoRef.current ? `${ditadoRef.current} ${t}` : t;
      setDitado(ditadoRef.current);
    },
  });

  // Ao parar, guarda o que foi falado. Espera o reconhecimento de fato terminar
  // (listening = false): os últimos trechos chegam antes disso.
  useEffect(() => {
    if (listening || !guardarAoParar.current) return;
    guardarAoParar.current = false;
    const texto = ditadoRef.current.trim();
    ditadoRef.current = "";
    setDitado("");
    if (!texto) return;
    const titulo = tituloDaIdeia(texto);
    void board.addSynapse(titulo, { kind: "ideia", learning: corpoDaIdeia(texto), titleAuto: true }).then((id) => {
      setGuardada(id ? titulo : null);
    });
  }, [listening, board]);

  function comecar() {
    setGuardada(null);
    ditadoRef.current = "";
    setDitado("");
    start();
  }

  function pararEGuardar() {
    guardarAoParar.current = true;
    stop();
  }

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    const id = await board.addSynapse(title, { kind: "ideia" });
    if (!id) setNewTitle(title);
  }

  const ideias = board.state.synapses.filter((s) => s.kind === "ideia");

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Ideias</span>
        <span style={{ width: 32 }} />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <BoltIcon filled /> Teve uma ideia?
          </div>
          <p>
            Jogue rápido aqui: fale ou escreva. O FARO guarda, dá um título e arquiva, e a ideia entra no
            seu mapa de aprendizado.
          </p>
          {supported ? (
            <div className="idea-voice">
              {!listening ? (
                <button type="button" className="btn btn-accent" onClick={comecar}>
                  <MicIcon /> Iniciar nova ideia
                </button>
              ) : (
                <button type="button" className="btn btn-accent idea-stop" onClick={pararEGuardar}>
                  Parar e guardar
                </button>
              )}
              {listening && (
                <div className="idea-live" role="status">
                  <span className="mic-dot" />
                  {ditado || partial ? (
                    <span>
                      {ditado} {partial}
                    </span>
                  ) : (
                    "Ouvindo… pode falar a ideia inteira."
                  )}
                </div>
              )}
              {!listening && guardada && (
                <div className="idea-saved">Guardada como &ldquo;{guardada}&rdquo;. Abaixo você pode editar.</div>
              )}
              {error && <div className="mic-error">{error}</div>}
            </div>
          ) : (
            <p className="hint-text">
              Este navegador não tem ditado. Use o microfone do teclado do celular no campo abaixo.
            </p>
          )}
        </div>

        <div className="list-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="+ Escrever uma ideia: dê um título e pressione Enter"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={handleAdd}
            />
            <MicButton onText={(t) => setNewTitle((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o título da ideia" />
          </div>
        </div>

        {!ideias.length && (
          <div className="list-card">
            <div className="hp-empty">Nenhuma ideia ainda. A primeira pode ser a de agora.</div>
          </div>
        )}

        <div className="synapse-list">
          {ideias.map((sy) => (
            <SynapseCard key={sy.id} synapse={sy} ideia />
          ))}
        </div>
      </div>
    </div>
  );
}
