"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { useBoardCtx } from "./board-context";
import { MicButton } from "./MicButton";
import { CheckIcon, TrashIcon } from "./icons";
import { TutorialLink } from "./TutorialLink";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { CATEGORIA_DE_SAUDE, limparCategoria, pareceSaude } from "@/lib/ia/categoria";
import type { QuickNote } from "@/lib/types";

const ARQUIVADAS = "__arquivadas__";
const TODAS = "__todas__";

/** Cores das categorias: as mesmas que o FARO já usa (trabalho, estudo, dev, saúde, pessoal, família). */
const CORES = ["--cat-estudo-text", "--cat-dev-text", "--cat-familia-text", "--cat-trabalho-text", "--cat-saude-text", "--cat-pessoal-text"];
function corDaCategoria(tag: string): string {
  if (!tag) return "--text-muted";
  if (tag.toLowerCase() === CATEGORIA_DE_SAUDE.toLowerCase()) return "--cat-saude-text";
  let h = 0;
  for (const c of tag.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

const quando = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function Cartao({ nota, categorias }: { nota: QuickNote; categorias: string[] }) {
  const { board, askConfirm } = useBoardCtx();
  const [aberto, setAberto] = useState(false);
  const [nova, setNova] = useState("");
  const arquivada = nota.status === "archived";
  const cor = corDaCategoria(nota.tag);

  function trocar(t: string) {
    const v = limparCategoria(t);
    if (v && v !== nota.tag) board.updateQuickNote(nota.id, { tag: v });
    setNova("");
  }

  return (
    <div className={"anot-cartao" + (aberto ? " aberto" : "") + (arquivada ? " arquivada" : "")} style={{ "--cor": `var(${cor})` } as CSSProperties}>
      {nota.isPrivate && (
        <span className="anot-cadeado" title="O FARO não lê esta anotação" aria-label="O FARO não lê esta anotação">
          🔒
        </span>
      )}
      {aberto ? (
        <textarea
          className="settings-input anot-texto"
          rows={4}
          defaultValue={nota.body}
          autoFocus
          aria-label="Texto da anotação"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== nota.body) board.updateQuickNote(nota.id, { body: v });
          }}
        />
      ) : (
        <button type="button" className="anot-cartao-texto" onClick={() => setAberto(true)} title="Tocar para abrir">
          {nota.body}
        </button>
      )}

      <div className="anot-cartao-rodape">
        <span className="anot-etq">{nota.tag || "Sem categoria"}</span>
        <span className="anot-data">{quando(nota.createdAt)}</span>
      </div>

      {aberto && (
        <div className="anot-abrir">
          <div className="anot-trocar">
            <span className="hint-text">Categoria:</span>
            {categorias.map((c) => (
              <button key={c} type="button" className={"disp-chip" + (c === nota.tag ? " ativo" : "")} onClick={() => trocar(c)}>
                {c}
              </button>
            ))}
            <input
              className="settings-input anot-nova-cat"
              placeholder="Outra…"
              value={nova}
              maxLength={24}
              onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") trocar(nova);
              }}
              aria-label="Criar categoria"
            />
          </div>
          <div className="anot-acoes">
            <button type="button" className="btn btn-ghost" onClick={() => board.updateQuickNote(nota.id, { isPrivate: !nota.isPrivate })}>
              {nota.isPrivate ? "Deixar o FARO ler" : "🔒 Só minha"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => board.updateQuickNote(nota.id, { status: arquivada ? "new" : "archived" })}>
              <CheckIcon /> {arquivada ? "Voltar para revisar" : "Revisada, arquivar"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => askConfirm("Apagar esta anotação?", () => board.deleteQuickNote(nota.id))}>
              <TrashIcon /> Apagar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAberto(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnotacoesView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState(TODAS);
  const [busca, setBusca] = useState("");
  const todas = board.state.quickNotes;
  const q = busca.trim().toLowerCase();
  const tentadas = useRef<Set<string>>(new Set());

  const ativas = todas.filter((n) => n.status === "new");
  const arquivadas = todas.length - ativas.length;
  const categorias = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of ativas) if (n.tag) c.set(n.tag, (c.get(n.tag) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [ativas]);
  const todasAsCategorias = useMemo(() => [...new Set(todas.map((n) => n.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [todas]);

  // Categoria automática: toda anotação sem categoria recebe uma (saúde fica local; a anotação "só minha" não vai à IA).
  const chave = todas.filter((n) => !n.tag).map((n) => n.id).join(",");
  useEffect(() => {
    if (!chave) return;
    const lote = todas.filter((n) => !n.tag && !tentadas.current.has(n.id));
    lote.forEach((n) => tentadas.current.add(n.id));
    const paraIA: QuickNote[] = [];
    for (const n of lote) {
      if (pareceSaude(n.body)) board.updateQuickNote(n.id, { tag: CATEGORIA_DE_SAUDE });
      else if (!n.isPrivate) paraIA.push(n);
    }
    if (!paraIA.length) return;
    fetch("/api/ia/categoria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: paraIA.slice(0, 12).map((n) => ({ id: n.id, texto: n.body })), existentes: todasAsCategorias }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { categorias?: Record<string, string> } | null) => {
        for (const [id, tag] of Object.entries(d?.categorias ?? {})) board.updateQuickNote(id, { tag });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const visiveis = todas
    .filter((n) => (filtro === ARQUIVADAS ? n.status === "archived" : n.status === "new" && (filtro === TODAS || n.tag === filtro)))
    .filter((n) => !q || (n.body + " " + n.tag).toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function guardar() {
    if (!texto.trim()) return;
    board.addQuickNote(texto);
    setTexto("");
  }

  const pilula = (id: string, rotulo: string, n: number) => (
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
        Anote rápido, escrevendo ou falando, sem escolher lugar. O FARO dá uma categoria a cada anotação. Itens de casa (“comprei cloro”) diga ao FARO: eles vão direto para a Dispensa. Dica: diga “anota: …”.
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
              placeholder="Escreva ou fale a anotação."
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

        <input type="search" className="settings-input disp-busca" placeholder="Buscar nas anotações" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar nas anotações" />
        <div className="view-toggle disp-filtros anot-filtros">
          {pilula(TODAS, "Todas", ativas.length)}
          {categorias.map(([c, n]) => pilula(c, c, n))}
          {arquivadas > 0 && pilula(ARQUIVADAS, "Arquivadas", arquivadas)}
        </div>

        {visiveis.length === 0 ? (
          <div className="hp-empty">{todas.length === 0 ? "Nenhuma anotação ainda." : filtro === TODAS && !q ? "Nada para revisar. Tudo em dia." : "Nada aqui."}</div>
        ) : (
          <div className="anot-grade">
            {visiveis.map((n) => (
              <Cartao key={n.id} nota={n} categorias={todasAsCategorias} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
