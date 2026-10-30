"use client";

import { useState, type CSSProperties } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { MicButton } from "./MicButton";
import { ArchiveIcon, CheckIcon, EditIcon, TrashIcon } from "./icons";
import { TutorialLink } from "./TutorialLink";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { itensDeUmTexto, type ItemDeTexto } from "@/lib/board/dispensa";
import { todayISO } from "@/lib/date-utils";
import type { QuickNote } from "@/lib/types";

type Filtro = "novas" | "todas" | "arquivadas";

const quando = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Linha({ nota }: { nota: QuickNote }) {
  const { board, askConfirm } = useBoardCtx();
  const [editando, setEditando] = useState(false);
  const [previa, setPrevia] = useState<(ItemDeTexto & { marcado: boolean })[] | null>(null);
  const arquivada = nota.status === "archived";

  function verItens() {
    setPrevia(itensDeUmTexto(nota.body, todayISO()).map((i) => ({ ...i, marcado: true })));
  }
  function criarItens() {
    if (!previa) return;
    const escolhidos = previa.filter((i) => i.marcado);
    escolhidos.forEach((i) =>
      board.addPantryItem(i.name, { quantity: i.quantity, unit: i.unit, status: i.status, place: i.place, expiresOn: i.expiresOn }),
    );
    // Virou itens da Dispensa: a anotação cumpriu o papel e vai para as arquivadas (não é apagada).
    if (escolhidos.length > 0) board.updateQuickNote(nota.id, { status: "archived" });
    setPrevia(null);
  }

  return (
    <div className={"anot-linha com-filete" + (arquivada ? " arquivada" : "")} style={{ "--k": arquivada ? "#9C9CA5" : "#3B82C4" } as CSSProperties}>
      <div className="anot-topo">
        <span className="tile-tipo">
          <EditIcon />
        </span>
        <div className="anot-corpo">
          {editando ? (
            <textarea
              className="settings-input anot-texto"
              rows={4}
              defaultValue={nota.body}
              autoFocus
              aria-label="Texto da anotação"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== nota.body) board.updateQuickNote(nota.id, { body: v });
                setEditando(false);
              }}
            />
          ) : (
            <button type="button" className="anot-ler" onClick={() => setEditando(true)} title="Tocar para editar">
              {nota.body}
            </button>
          )}
          <div className="anot-meta">
            <span>{quando(nota.createdAt)}</span>
            {nota.tag && <span className="disp-chip">{nota.tag}</span>}
            {nota.isPrivate && <span className="disp-chip">o FARO não lê</span>}
          </div>
        </div>
      </div>

      {previa && (
        <div className="anot-previa">
          <b>{previa.length === 0 ? "Não achei itens neste texto." : "Vão para a Dispensa (confira antes):"}</b>
          {previa.map((i, n) => (
            <label key={n} className="anot-previa-item">
              <input type="checkbox" checked={i.marcado} onChange={(e) => setPrevia(previa.map((x, m) => (m === n ? { ...x, marcado: e.target.checked } : x)))} />
              <span>
                {i.name} · {i.quantity}
                {i.unit ? " " + i.unit : ""}
                {i.status === "low" ? " · acabando" : i.status === "out" ? " · acabou" : ""}
                {i.place ? ` · ${i.place}` : ""}
                {i.expiresOn ? ` · vence ${i.expiresOn.split("-").reverse().join("/")}` : ""}
              </span>
            </label>
          ))}
          <div className="disp-aviso-acoes">
            <button type="button" className="btn btn-accent" onClick={criarItens} disabled={!previa.some((i) => i.marcado)}>
              <CheckIcon /> Criar na Dispensa
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPrevia(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="anot-acoes">
        {!arquivada && (
          <button type="button" className="btn btn-ghost" onClick={verItens}>
            <ArchiveIcon /> Virar itens da Dispensa
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => board.updateQuickNote(nota.id, { isPrivate: !nota.isPrivate })}>
          {nota.isPrivate ? "Deixar o FARO ler" : "Só minha"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => board.updateQuickNote(nota.id, { status: arquivada ? "new" : "archived" })}>
          <CheckIcon /> {arquivada ? "Voltar para revisar" : "Revisada, arquivar"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => askConfirm("Apagar esta anotação?", () => board.deleteQuickNote(nota.id))}>
          <TrashIcon /> Apagar
        </button>
      </div>
    </div>
  );
}

export function AnotacoesView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("novas");
  const [busca, setBusca] = useState("");
  const todas = board.state.quickNotes;
  const novas = todas.filter((n) => n.status === "new").length;
  const arquivadas = todas.length - novas;
  const q = busca.trim().toLowerCase();

  const visiveis = todas
    .filter((n) => (filtro === "novas" ? n.status === "new" : filtro === "arquivadas" ? n.status === "archived" : true))
    .filter((n) => !q || (n.body + " " + n.tag).toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function guardar() {
    if (!texto.trim()) return;
    board.addQuickNote(texto);
    setTexto("");
  }

  const pilula = (id: Filtro, rotulo: string, n: number) => (
    <button key={id} type="button" className={"view-toggle-btn" + (filtro === id ? " active" : "")} onClick={() => setFiltro(id)}>
      {rotulo} {n}
    </button>
  );

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Anotações</span>
        <TutorialLink secao="anotacoes" />
      </div>
      <div className="hint-text" style={{ marginBottom: 12 }}>
        Anote rápido, escrevendo ou falando, sem escolher lugar. Depois você revisa: transforma em itens da Dispensa, arquiva ou apaga. Dica: diga ao FARO “anota: …” e ele guarda aqui (ou no lugar certo, se o assunto tiver um).
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <textarea
              className="quickadd-input anot-novo"
              rows={2}
              placeholder="Escreva ou fale a anotação. Pode ser uma lista (um item por linha)."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) guardar();
              }}
              aria-label="Nova anotação"
            />
            <MicButton onText={(t) => setTexto((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar a anotação" />
            <EnviarBtn onClick={guardar} label="Guardar a anotação" />
          </div>
        </div>

        <div className="view-toggle disp-filtros">
          {pilula("novas", "Para revisar", novas)}
          {pilula("todas", "Todas", todas.length)}
          {pilula("arquivadas", "Arquivadas", arquivadas)}
        </div>
        {todas.length > 6 && (
          <input type="search" className="settings-input disp-busca" placeholder="Buscar nas anotações" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar nas anotações" />
        )}

        <div className="list-card disp-lista">
          {visiveis.length === 0 ? (
            <div className="hp-empty">{todas.length === 0 ? "Nenhuma anotação ainda." : filtro === "novas" ? "Nada para revisar. Tudo em dia." : "Nada aqui."}</div>
          ) : (
            visiveis.map((n) => <Linha key={n.id} nota={n} />)
          )}
        </div>
      </div>
    </div>
  );
}
