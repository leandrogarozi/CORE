"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { ToggleSwitch } from "./ToggleSwitch";
import { TimePicker } from "./TimePicker";
import { CheckIcon, EditIcon, HeartIcon, TrashIcon } from "./icons";
import { MicButton } from "./MicButton";
import { todayISO } from "@/lib/date-utils";
import { creditoDaFrase, fraseDaVez, horariosEmUso, HORARIOS_PADRAO, MAX_FRASES_POR_DIA } from "@/lib/metanoia";
import type { MetanoiaFrase, MetanoiaOrigem } from "@/lib/types";

type Aba = "aprovadas" | "favoritas" | "revisar";

const ROTULO_DA_ORIGEM: Record<MetanoiaOrigem, string> = {
  minha: "Minha",
  faro: "Do meu FARO",
  print: "De print",
  ia: "Da minha IA",
};

function Cartao({ frase, aprovando }: { frase: MetanoiaFrase; aprovando: boolean }) {
  const { board, askConfirm } = useBoardCtx();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(frase.texto);
  const [autor, setAutor] = useState(frase.autor ?? "");

  function salvar() {
    const t = texto.trim();
    if (!t) return;
    board.updateMetanoiaFrase(frase.id, { texto: t, autor: autor.trim() || null });
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="meta-frase editando">
        <textarea value={texto} rows={3} aria-label="Texto da frase" onChange={(e) => setTexto(e.target.value)} />
        <input type="text" value={autor} placeholder="Autor (opcional)" aria-label="Autor" onChange={(e) => setAutor(e.target.value)} />
        <div className="edit-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setEditando(false)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" disabled={!texto.trim()} onClick={salvar}>
            Salvar
          </button>
        </div>
      </div>
    );
  }

  const credito = creditoDaFrase(frase);
  return (
    <div className="meta-frase">
      <div className="meta-frase-corpo">
        <p className="meta-frase-texto">&ldquo;{frase.texto}&rdquo;</p>
        <div className="meta-frase-meta">
          {credito && <span>{credito}</span>}
          <span className="meta-origem">{ROTULO_DA_ORIGEM[frase.origem]}</span>
        </div>
      </div>
      <div className="meta-frase-acoes">
        {aprovando ? (
          <>
            <button type="button" className="btn btn-ghost know-aprovar" onClick={() => board.updateMetanoiaFrase(frase.id, { status: "aprovada" })}>
              <CheckIcon /> Aprovar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => board.updateMetanoiaFrase(frase.id, { status: "arquivada" })}>
              Recusar
            </button>
          </>
        ) : (
          <button
            type="button"
            className={"icon-btn" + (frase.favorita ? " active" : "")}
            aria-pressed={frase.favorita}
            title={frase.favorita ? "Tirar dos favoritos" : "Favoritar (aparece mais vezes)"}
            onClick={() => board.updateMetanoiaFrase(frase.id, { favorita: !frase.favorita })}
          >
            <HeartIcon filled={frase.favorita} />
          </button>
        )}
        <button type="button" className="icon-btn" title="Editar" aria-label="Editar frase" onClick={() => setEditando(true)}>
          <EditIcon />
        </button>
        {!aprovando && (
          <button
            type="button"
            className="icon-btn danger-hover"
            title="Não mostrar mais"
            aria-label="Tirar da rotação"
            onClick={() => askConfirm("Tirar essa frase da Metanoia? Ela some da lista e dos lembretes.", () => board.updateMetanoiaFrase(frase.id, { status: "arquivada" }))}
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export function MetanoiaView({ onBack }: { onBack: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const s = board.state.settings;
  const frases = board.state.metanoiaFrases;
  const aprovadas = frases.filter((f) => f.status === "aprovada");
  const pendentes = frases.filter((f) => f.status === "pendente");
  const [aba, setAba] = useState<Aba>("aprovadas");
  const [origem, setOrigem] = useState<"todas" | MetanoiaOrigem>("todas");
  const [novo, setNovo] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [outra, setOutra] = useState<MetanoiaFrase | null>(null);

  const hoje = todayISO();
  const daVez = fraseDaVez(frases, hoje, 0);
  const emDestaque = outra && aprovadas.some((f) => f.id === outra.id) ? aprovadas.find((f) => f.id === outra.id)! : daVez;
  const horarios = horariosEmUso(s.metanoiaVezes, s.metanoiaHorarios);
  const todosHorarios = [...s.metanoiaHorarios, ...HORARIOS_PADRAO].slice(0, MAX_FRASES_POR_DIA);

  function sortearOutra() {
    // A próxima da lista depois da que está na tela (volta ao começo no fim).
    const i = aprovadas.findIndex((f) => f.id === emDestaque?.id);
    if (aprovadas.length > 1) setOutra(aprovadas[(i + 1) % aprovadas.length]);
  }

  function adicionar() {
    if (!novo.trim()) return;
    const id = board.addMetanoiaFrase({ texto: novo, autor: novoAutor, origem: "minha" });
    if (id) {
      setNovo("");
      setNovoAutor("");
    }
  }

  function trocarHorario(i: number, v: string) {
    const lista = [...todosHorarios];
    lista[i] = v;
    board.updateSettings({ metanoiaHorarios: lista });
  }

  const base = aba === "revisar" ? pendentes : aba === "favoritas" ? aprovadas.filter((f) => f.favorita) : aprovadas;
  const lista = base.filter((f) => origem === "todas" || f.origem === origem);

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Metanoia</span>
        <span style={{ width: 32 }} />
      </div>

      <div className="narrow-list">
        <p className="hint-text">Metanoia é a mudança de mente. Aqui voltam até você o que você aprendeu e no que acredita, em frases curtas, durante o dia.</p>

        <div className="meta-hoje">
          <div className="meta-hoje-rotulo">Hoje</div>
          {emDestaque ? (
            <>
              <p className="meta-hoje-texto">&ldquo;{emDestaque.texto}&rdquo;</p>
              {creditoDaFrase(emDestaque) && <div className="meta-hoje-credito">{creditoDaFrase(emDestaque)}</div>}
              <div className="meta-hoje-acoes">
                <button
                  type="button"
                  className={"btn btn-ghost" + (emDestaque.favorita ? " saved-btn" : "")}
                  onClick={() => board.updateMetanoiaFrase(emDestaque.id, { favorita: !emDestaque.favorita })}
                >
                  <HeartIcon filled={emDestaque.favorita} /> {emDestaque.favorita ? "Favorita" : "Favoritar"}
                </button>
                <button type="button" className="btn btn-ghost" disabled={aprovadas.length < 2} onClick={sortearOutra}>
                  Outra
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(emDestaque.texto + (emDestaque.autor ? ` — ${emDestaque.autor}` : ""))}>
                  Copiar
                </button>
              </div>
            </>
          ) : (
            <p className="hint-text">Nenhuma frase aprovada ainda. Escreva a primeira abaixo{pendentes.length ? " ou aprove as que o FARO sugeriu em “Para revisar”" : ""}.</p>
          )}
        </div>

        <div className="diet-page-card">
          <span className="diet-card-titulo">Quando o FARO me lembra</span>
          <div className="meta-vezes" role="group" aria-label="Quantas frases por dia">
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={"meeting-modo-btn" + (s.metanoiaVezes === n ? " ativo" : "")}
                onClick={() => board.updateSettings({ metanoiaVezes: n })}
              >
                {n === 0 ? "Desligado" : n === 1 ? "1 por dia" : `${n} por dia`}
              </button>
            ))}
          </div>
          {horarios.length > 0 && (
            <div className="meta-horarios">
              {horarios.map((h, i) => (
                <TimePicker key={i} value={h} onChange={(v) => trocarHorario(i, v)} />
              ))}
            </div>
          )}
          <label className="diet-channel-option" style={{ marginTop: 10 }}>
            <ToggleSwitch checked={s.metanoiaPush} ariaLabel="Avisar por notificação" onChange={(v) => board.updateSettings({ metanoiaPush: v })} />
            Por notificação no celular
          </label>
          <span className="hint-text">A notificação precisa estar ligada em Configurações. Por WhatsApp ainda não, para não gastar crédito.</span>
        </div>

        <div className="list-card">
          <div className="meta-novo">
            <textarea
              value={novo}
              rows={2}
              placeholder="Escrever uma frase"
              aria-label="Nova frase"
              onChange={(e) => setNovo(e.target.value)}
            />
            <div className="meta-novo-linha">
              <input type="text" value={novoAutor} placeholder="Autor (opcional)" aria-label="Autor da frase" onChange={(e) => setNovoAutor(e.target.value)} />
              <MicButton onText={(t) => setNovo((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar a frase" />
              <button type="button" className="btn btn-accent" disabled={!novo.trim()} onClick={adicionar}>
                Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="meta-abas">
          <div className="view-toggle">
            {(
              [
                ["aprovadas", `Aprovadas ${aprovadas.length}`],
                ["favoritas", `Favoritas ${aprovadas.filter((f) => f.favorita).length}`],
                ["revisar", `Para revisar ${pendentes.length}`],
              ] as const
            ).map(([v, rotulo]) => (
              <button key={v} type="button" className={"view-toggle-btn" + (aba === v ? " active" : "")} onClick={() => setAba(v)}>
                {rotulo}
              </button>
            ))}
          </div>
          <select value={origem} aria-label="Origem" onChange={(e) => setOrigem(e.target.value as typeof origem)}>
            <option value="todas">Todas as origens</option>
            {(Object.keys(ROTULO_DA_ORIGEM) as MetanoiaOrigem[]).map((o) => (
              <option key={o} value={o}>
                {ROTULO_DA_ORIGEM[o]}
              </option>
            ))}
          </select>
          {aba === "revisar" && lista.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                askConfirm(`Aprovar as ${lista.length} frases mostradas? Dá para tirar uma por uma depois.`, () =>
                  lista.forEach((f) => board.updateMetanoiaFrase(f.id, { status: "aprovada" }))
                )
              }
            >
              Aprovar todas ({lista.length})
            </button>
          )}
        </div>

        {lista.length === 0 ? (
          <div className="list-card">
            <div className="hp-empty">
              {aba === "revisar" ? "Nada para revisar agora. Quando o FARO tiver frases novas, elas aparecem aqui." : aba === "favoritas" ? "Nenhuma favorita ainda." : "Nenhuma frase ainda."}
            </div>
          </div>
        ) : (
          <div className="meta-lista">
            {lista.map((f) => (
              <Cartao key={f.id} frase={f} aprovando={aba === "revisar"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
