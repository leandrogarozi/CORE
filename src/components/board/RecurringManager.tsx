"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { MinutesPicker } from "./TimePicker";
import { EditIcon, TrashIcon } from "./icons";
import { RecurringEditRow } from "./RecurringSection";
import { fmtHM } from "@/lib/date-utils";
import { CATEGORY_LABEL, type RecurringItem } from "@/lib/types";

type Kind = "habit" | "block";

/**
 * Cadastro de Hábitos e de Dia a Dia, em Configurações. É aqui que se cria, edita e apaga;
 * na tela principal só se marca (play, check) — ver RecurringSection com podeCadastrar={false}.
 * A edição reaproveita o mesmo formulário que a linha da tela principal já usava.
 */
export function RecurringManager({ kind }: { kind: Kind }) {
  const { board, askConfirm } = useBoardCtx();
  const lista = [...(kind === "habit" ? board.state.habits : board.state.fixedBlocks)].sort((a, b) => a.order - b.order);
  const [nome, setNome] = useState("");
  const [minutos, setMinutos] = useState<number | null>(null);

  function adicionar() {
    const n = nome.trim();
    if (!n) return;
    board.addRecurring(kind, n, minutos);
    setNome("");
    setMinutos(null);
  }

  return (
    <div className="mgr">
      {lista.length === 0 && <div className="hint-text">Nada cadastrado ainda.</div>}
      {lista.map((item) => (
        <ItemDoCadastro key={item.id} kind={kind} item={item} onExcluir={() => askConfirm(`Excluir "${item.name}"? Os registros dele somem junto.`, () => board.deleteRecurringItem(kind, item.id))} />
      ))}
      <div className="habit-add mgr-add">
        <input
          type="text"
          placeholder={kind === "habit" ? "Novo hábito (ex.: Alongar)" : "Novo item (ex.: Almoço)"}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
        />
        <MinutesPicker className="block-duration-input" minutes={minutos} onChange={setMinutos} />
        <button type="button" className="btn btn-accent" onClick={adicionar}>
          {kind === "habit" ? "+ Novo hábito" : "+ Novo item"}
        </button>
      </div>
    </div>
  );
}

function ItemDoCadastro({ kind, item, onExcluir }: { kind: Kind; item: RecurringItem; onExcluir: () => void }) {
  const [editando, setEditando] = useState(false);
  if (editando) return <RecurringEditRow kind={kind} item={item} onDone={() => setEditando(false)} />;
  return (
    <div className="mgr-row">
      <span className="mgr-nome">{item.name}</span>
      <span className="mgr-min">{item.durationMin ? fmtHM(item.durationMin) : "sem duração"}</span>
      <span className="mgr-tag">{item.category ? CATEGORY_LABEL[item.category] : "sem tag"}</span>
      <button className="icon-btn" type="button" title="Editar" onClick={() => setEditando(true)}>
        <EditIcon />
      </button>
      <button className="icon-btn danger-hover" type="button" title="Excluir" onClick={onExcluir}>
        <TrashIcon />
      </button>
    </div>
  );
}
