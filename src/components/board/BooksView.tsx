"use client";

import { useEffect, useRef, useState } from "react";
import { EnviarBtn } from "./EnviarBtn";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { AttachmentsButton } from "./AttachmentsButton";
import {
  BookIcon,
  BookmarkIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronIcon,
  CommentIcon,
  DownloadIcon,
  DragGripIcon,
  FilmIcon,
  FlagIcon,
  SearchIcon,
  TrashIcon,
  TvIcon,
  WeekIcon,
  SendIcon,
} from "./icons";
import { RichTextEditor } from "./RichTextEditor";
import { priorityColor, priorityLabel, nextPriority } from "./TaskRow";
import { fmtDayMonth, fmtShortDate, isoFromDate } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { stripHtml } from "@/lib/rich-text";
import { listaReordenada } from "@/lib/board/reordenar";
import { arquivoDoLivro } from "@/lib/learning-export";
import { baixarTexto, soONome } from "@/lib/baixar";
import { TutorialLink } from "./TutorialLink";
import { LIMITE_DA_SINAPSE } from "./SynapsesView";
import { escaparHtml } from "./PerguntasDaIA";
import { todayISO } from "@/lib/date-utils";
import {
  BOOK_KIND_INFO,
  BOOK_KIND_ORDER,
  BOOK_STATUS_COLOR,
  BOOK_STATUS_ORDER,
  type Book,
  type BookKind,
  type BookStatus,
} from "@/lib/types";

// Anotação curta ("do que se trata") fica aqui, como lembrete da lista. Só a partir deste tamanho ela
// já é um aprendizado que pode ser levado: até LIMITE_DA_SINAPSE vai para uma Sinapse, acima disso para um Estudo.
const MINIMO_PARA_LEVAR = 1500;

// Ícone de cada tipo (a cor vem de .k-livro, .k-filme e .k-serie).
const BOOK_KIND_ICON: Record<BookKind, () => React.JSX.Element> = {
  livro: BookIcon,
  filme: FilmIcon,
  serie: TvIcon,
};

const BOOK_STATUS_ICON: Record<BookStatus, () => React.JSX.Element> = {
  para_ler: BookmarkIcon,
  lendo: BookOpenIcon,
  finalizado: BookIcon,
};

function BookStartDatePopover({
  anchorRect,
  initialValue,
  onSave,
  onClose,
}: {
  anchorRect: DOMRect;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onClose]);

  function save() {
    onSave(draft);
  }

  return createPortal(
    <div className="daylog-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
      <input
        type="date"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") onClose();
        }}
      />
      <div className="edit-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-accent" onClick={save}>
          Salvar
        </button>
      </div>
    </div>,
    document.body
  );
}

function BookStartDateButton({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (anchorRect) {
      setAnchorRect(null);
    } else if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"book-date-btn" + (book.startedAt ? " has-date" : "")}
        title={book.startedAt ? `Início: ${fmtShortDate(book.startedAt)}` : "Definir data de início"}
        onClick={toggleOpen}
      >
        <WeekIcon />
        {book.startedAt && <span>{fmtShortDate(book.startedAt)}</span>}
      </button>
      {anchorRect && (
        <BookStartDatePopover
          anchorRect={anchorRect}
          initialValue={book.startedAt ?? ""}
          onSave={(value) => {
            board.updateBook(book.id, { startedAt: value || null });
            setAnchorRect(null);
          }}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
  );
}

function BookStatusMenu({
  anchorRect,
  currentStatus,
  kind,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  currentStatus: BookStatus;
  kind: BookKind;
  onSelect: (status: BookStatus) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onClose]);

  return createPortal(
    <div className="status-menu" ref={ref} style={{ top: pos.top, left: pos.left }}>
      {BOOK_STATUS_ORDER.map((s) => (
        <button
          type="button"
          key={s}
          className={"status-menu-item" + (s === currentStatus ? " active" : "")}
          onClick={() => onSelect(s)}
        >
          <span className="status-menu-dot" style={{ background: BOOK_STATUS_COLOR[s] }} />
          {BOOK_KIND_INFO[kind].status[s]}
        </button>
      ))}
    </div>,
    document.body
  );
}

function BookStatusPicker({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (anchorRect) {
      setAnchorRect(null);
    } else if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"status-pill book-status-pill" + (book.status === "finalizado" ? " done" : "")}
        style={{ "--status-color": BOOK_STATUS_COLOR[book.status] } as React.CSSProperties}
        title={BOOK_KIND_INFO[book.kind].status[book.status]}
        onClick={toggleOpen}
      >
        {/* Mesmo desenho do status das tarefas: bolinha com o nome (Para assistir, Assistindo, Assistido). */}
        {book.status === "finalizado" ? (
          <span className="status-pill-check">
            <CheckIcon />
          </span>
        ) : (
          <span className="status-pill-dot" />
        )}
        <span className="status-pill-label">{BOOK_KIND_INFO[book.kind].status[book.status]}</span>
        {/* No celular o ícone do livro passa a ser o botão de status: verde = concluído, amarelo = lendo, azul = para ler. */}
        <span className="book-status-icone" aria-hidden="true">
          {(() => {
            const Icone = BOOK_KIND_ICON[book.kind];
            return <Icone />;
          })()}
        </span>
      </button>
      {anchorRect && (
        <BookStatusMenu
          anchorRect={anchorRect}
          kind={book.kind}
          currentStatus={book.status}
          onSelect={(status) => {
            board.updateBook(book.id, { status });
            setAnchorRect(null);
          }}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
  );
}

function BookInsightsButton({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(book.insights ?? "");
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  function openSheet(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(book.insights ?? "");
    setOpen(true);
  }

  function save() {
    board.updateBook(book.id, { insights: draft || null });
    setOpen(false);
  }

  // Auto-save a cada 30s pra não perder texto se fechar sem clicar em Salvar.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => board.updateBook(book.id, { insights: draftRef.current || null }), 30000);
    return () => clearInterval(id);
  }, [open, board, book.id]);

  return (
    <>
      <button
        type="button"
        className={"comment-btn" + (book.insights ? " has-comment" : "")}
        aria-label={`Resumo e insights do ${BOOK_KIND_INFO[book.kind].um}`}
        title={stripHtml(book.insights ?? "") || "Resumo / insights"}
        onClick={openSheet}
      >
        <CommentIcon />
      </button>
      {open &&
        createPortal(
          <>
            <div className="modal-backdrop" onClick={() => setOpen(false)} />
            <div className="modal-panel book-sheet" role="dialog" aria-label={`Resumo de ${book.title}`}>
              <div className="modal-head">
                <span className="modal-title">{book.title}</span>
              </div>
              <div className="hint-text">
                Do que se trata {book.kind === "livro" ? "esse livro" : book.kind === "filme" ? "esse filme" : "essa série"} e por que você quer {book.kind === "livro" ? "ler" : "ver"}: poucas linhas já bastam. Se você escrever um aprendizado de verdade, a partir de {MINIMO_PARA_LEVAR.toLocaleString("pt-BR")} caracteres, aparece o botão <strong>Levar para…</strong>.
              </div>
              <RichTextEditor value={draft} onChange={setDraft} placeholder="Do que se trata, o que chamou atenção..." autoFocus />
              <div className="hint-text" style={{ marginTop: 4 }}>
                {stripHtml(draft).length.toLocaleString("pt-BR")} caracteres
                {stripHtml(draft).length >= MINIMO_PARA_LEVAR ? " · já dá para levar para " + (stripHtml(draft).length <= LIMITE_DA_SINAPSE ? "uma Sinapse" : "um Estudo") : ""}
              </div>
              <div className="edit-actions" style={{ marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-accent" onClick={save}>
                  Salvar
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

function BookPriorityFlag({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  return (
    <button
      type="button"
      className="flag flag-btn"
      title={`${priorityLabel(book.priority)} — clique pra mudar`}
      onClick={(e) => {
        e.stopPropagation();
        board.updateBook(book.id, { priority: nextPriority(book.priority) });
      }}
    >
      <FlagIcon color={priorityColor(book.priority)} />
    </button>
  );
}

/**
 * Depois de concluir (assistido/lido), as anotações podem ir para onde viram aprendizado:
 * Estudos (Ideias e Estudos) ou Nova Sinapse. Assim as anotações do filme/série não ficam soltas aqui.
 */
function BookEnviarAnotacoes({ book }: { book: Book }) {
  const { board } = useBoardCtx();
  // "escolher": para onde? · "perguntas": só para Nova Sinapse, lembra de anotar as perguntas.
  const [etapa, setEtapa] = useState<"fechado" | "escolher" | "perguntas">("fechado");
  const [perguntas, setPerguntas] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const info = BOOK_KIND_INFO[book.kind];
  const fonte = `${book.kind === "livro" ? "Livro" : book.kind === "filme" ? "Filme" : "Série"}: ${book.title}`;
  // O registro vem das próprias sinapses/estudos criados (fonte = este item): não precisa de coluna nova
  // e some sozinho se ele apagar o que foi enviado — aí o botão volta.
  const enviados = board.state.synapses.filter((x) => x.source === fonte);
  if (enviados.length > 0) {
    return (
      <span className="book-enviado" title="As anotações já foram levadas para lá">
        {enviados.map((x) => (
          <span key={x.id} className="book-enviado-tag">
            ✓ Levada para {x.kind === "ideia" ? "Estudo" : "Sinapse"} · {fmtDayMonth(isoFromDate(new Date(x.createdAt)))}
          </span>
        ))}
      </span>
    );
  }
  // Anotação curta é só a descrição da lista: não oferece levar para lugar nenhum.
  if (stripHtml(book.insights ?? "").trim().length < MINIMO_PARA_LEVAR) return null;

  function jaEnviado(para: "estudo" | "sinapse") {
    return board.state.synapses.some((s) => s.source === fonte && (para === "estudo" ? s.kind === "ideia" : s.kind === "sinapse"));
  }

  function fechar() {
    setEtapa("fechado");
    setPerguntas("");
  }

  const notas = stripHtml(book.insights ?? "");
  const cabeNaSinapse = notas.length <= LIMITE_DA_SINAPSE;

  async function enviar(para: "estudo" | "sinapse") {
    if (jaEnviado(para)) {
      fechar();
      setAviso(`Já enviado para ${para === "estudo" ? "Estudos" : "Nova Sinapse"}.`);
      setTimeout(() => setAviso(null), 4000);
      return;
    }
    setEnviando(true);
    const id = await board.addSynapse(
      book.title,
      para === "estudo"
        ? {
            kind: "ideia",
            tag: "estudo",
            learning: `<p>Anotações ${info.um === "livro" ? "do livro" : info.um === "filme" ? "do filme" : "da série"} “${escaparHtml(book.title)}”. O texto está no conhecimento <strong>Conteúdo original</strong>; divida em vários quando quiser.</p>`,
            source: fonte,
          }
        : { kind: "sinapse", learning: book.insights ?? "", questions: perguntas, source: fonte }
    );
    // O estudo guarda o texto inteiro numa primeira parte, para nada ficar solto e a IA poder criar perguntas dali.
    if (id && para === "estudo") board.addSynapsePart(id, { title: "Conteúdo original", kind: "outro", date: todayISO(), body: book.insights ?? "" });
    setEnviando(false);
    fechar();
    if (!id) {
      setAviso("Não consegui enviar agora.");
      setTimeout(() => setAviso(null), 4000);
    }
  }

  return (
    <span className="book-enviar">
      <button
        type="button"
        className="btn btn-ghost book-enviar-btn"
        title={`Levar as anotações ${info.um === "livro" ? "deste livro" : info.um === "filme" ? "deste filme" : "desta série"} para uma Sinapse ou um Estudo`}
        onClick={() => setEtapa("escolher")}
      >
        <span className="book-enviar-icone" aria-hidden="true">
          <SendIcon />
        </span>
        <span className="book-enviar-rotulo">Levar para…</span>
      </button>
      {aviso && <span className="book-enviar-aviso">{aviso}</span>}
      {etapa !== "fechado" &&
        createPortal(
          <>
            <div className="modal-backdrop" onClick={fechar} />
            <div className="modal-panel book-sheet" role="dialog" aria-label={`Levar as anotações de ${book.title}`}>
              <div className="modal-head">
                <span className="modal-title">Levar as anotações: {book.title}</span>
              </div>
              {etapa === "escolher" ? (
                <>
                  <div className="hint-text">
                    Anotação com {notas.length.toLocaleString("pt-BR")} caracteres. Pelo tamanho, o melhor lugar é:
                  </div>
                  <div className="book-enviar-opcoes">
                    {cabeNaSinapse ? (
                      <button type="button" className="book-enviar-opcao" onClick={() => setEtapa("perguntas")}>
                        <strong>Sinapse</strong>
                        <span>
                          Um aprendizado curto, com a pergunta que te reconecta. Cabe: {notas.length.toLocaleString("pt-BR")} de{" "}
                          {LIMITE_DA_SINAPSE.toLocaleString("pt-BR")}.
                        </span>
                      </button>
                    ) : (
                      <button type="button" className="book-enviar-opcao" disabled={enviando} onClick={() => void enviar("estudo")}>
                        <strong>Estudo</strong>
                        <span>
                          O texto passa de {LIMITE_DA_SINAPSE.toLocaleString("pt-BR")} caracteres, grande demais para uma sinapse. Vira o conhecimento “Conteúdo
                          original” de um estudo, e você divide depois. Nada se perde.
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="edit-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="btn btn-ghost" onClick={fechar}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="hint-text">
                    Não esqueça: anote as perguntas ligadas {book.kind === "serie" ? "a esta série" : book.kind === "filme" ? "a este filme" : "a este livro"}. É a pergunta que te reconecta com o aprendizado
                    depois. (Dá para completar na Nova Sinapse também.)
                  </div>
                  <RichTextEditor value={perguntas} onChange={setPerguntas} placeholder="Que perguntas esse estudo gera?" autoFocus />
                  <div className="edit-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setEtapa("escolher")}>
                      Voltar
                    </button>
                    <button type="button" className="btn btn-accent" disabled={enviando} onClick={() => void enviar("sinapse")}>
                      Levar para Sinapse
                    </button>
                  </div>
                </>
              )}
            </div>
          </>,
          document.body
        )}
    </span>
  );
}

function BookRow({
  book,
  draggable,
  dragging,
  position,
  onDragStart,
  onDragOverRow,
  onDrop,
}: {
  book: Book;
  draggable?: boolean;
  dragging?: boolean;
  position?: number;
  onDragStart?: (id: string) => void;
  onDragOverRow?: (id: string) => void;
  onDrop?: () => void;
}) {
  const { board, focusRequest, consumeFocusRequest } = useBoardCtx();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  // O título cresce com o texto e quebra em linhas (no celular não fica cortado).
  const tituloRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = tituloRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [titleDraft, book.title]);
  const [flash, setFlash] = useState(false);

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== book.title) board.updateBook(book.id, { title: trimmed });
    setTitleDraft(null);
  }

  useEffect(() => {
    if (focusRequest?.kind === "book" && focusRequest.id === book.id) {
      document.querySelector(`[data-id="${book.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reagindo a um pedido de foco vindo da busca (sistema externo)
      setFlash(true);
      consumeFocusRequest("book", book.id);
      const id = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(id);
    }
  }, [focusRequest, consumeFocusRequest, book.id]);

  return (
    <div
      data-id={book.id}
      className={"book-row com-filete k-" + book.kind + (dragging ? " dragging" : "") + (flash ? " flash" : "")}
      draggable={draggable}
      onDragStart={() => onDragStart?.(book.id)}
      onDragOver={(e) => {
        if (!draggable) return;
        e.preventDefault();
        onDragOverRow?.(book.id);
      }}
      onDrop={(e) => {
        if (!draggable) return;
        e.preventDefault();
        onDrop?.();
      }}
    >
      {draggable && (
        <span className="book-row-order" title="Arraste pra reordenar a fila de leitura">
          <DragGripIcon />
          <span className="book-row-order-num mono">{position}</span>
        </span>
      )}
      <span className="tile-tipo" aria-hidden="true">
        {(() => {
          const Icone = BOOK_KIND_ICON[book.kind];
          return <Icone />;
        })()}
      </span>
      {/* Mesmo lugar e tamanho da bolinha de status das tarefas: logo depois da
          ordem, antes do título. Mudar de tela não muda o jeito de agir. */}
      <BookStatusPicker book={book} />
      <textarea
        ref={tituloRef}
        rows={1}
        className="book-title-input book-title-area"
        value={titleDraft ?? book.title}
        onChange={(e) => setTitleDraft(e.target.value.replace(/\n/g, " "))}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      {book.status === "lendo" && <BookStartDateButton book={book} />}
      <BookPriorityFlag book={book} />
      <BookInsightsButton book={book} />
      <BookEnviarAnotacoes book={book} />
      <AttachmentsButton entityType="book" entityId={book.id} ariaLabel={`Anexos do ${BOOK_KIND_INFO[book.kind].um}`} />
      {(() => {
        const arquivo = arquivoDoLivro(book);
        return arquivo ? (
          <button
            className="icon-btn"
            type="button"
            title="Baixar o resumo como arquivo (.md)"
            onClick={() => baixarTexto(soONome(arquivo.nome), arquivo.conteudo)}
          >
            <DownloadIcon />
          </button>
        ) : null;
      })()}
      <button
        className="icon-btn danger-hover"
        type="button"
        title="Excluir"
        onClick={() => board.deleteBook(book.id)}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function BooksView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const [kind, setKind] = useState<BookKind>("livro");
  const info = BOOK_KIND_INFO[kind];
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Partial<Record<BookStatus, boolean>>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const searchTerm = search.trim().toLowerCase();

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    board.addBook(title, kind);
    setNewTitle("");
  }

  function toggleGroup(status: BookStatus) {
    setCollapsed((c) => ({ ...c, [status]: !c[status] }));
  }

  function handleDrop(books: Book[]) {
    const ids = books.map((b) => b.id);
    // Mesma conta dos checklists, agora num lugar só (`listaReordenada`): eram
    // duas cópias de um laço com índice fácil de errar.
    const novos = listaReordenada(ids, draggingId, overId);
    if (novos !== ids) board.reorderBooks(novos);
    setDraggingId(null);
    setOverId(null);
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Livros, filmes e séries</span>
        <TutorialLink secao="livros" />
      </div>

      <div className="narrow-list">
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <BookIcon /> Sua estante
          </div>
          <p>
            É uma <strong>lista</strong> do que você leu, está lendo ou quer ver: serve para achar rápido e não perder a fila. Nas
            anotações, escreva só <strong>do que se trata</strong> e por que quer ver. Se você escrever um aprendizado de verdade
            (a partir de {MINIMO_PARA_LEVAR.toLocaleString("pt-BR")} caracteres), aparece <strong>Levar para…</strong>: de{" "}
            {MINIMO_PARA_LEVAR.toLocaleString("pt-BR")} a {LIMITE_DA_SINAPSE.toLocaleString("pt-BR")} caracteres vai para uma Sinapse; acima disso,
            para um Estudo.
          </p>
        </div>
        <div className="note-options-chips book-kind-abas" role="tablist" aria-label="Escolha a lista">
          {BOOK_KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={"note-chip" + (kind === k ? " active" : "")}
              onClick={() => {
                setKind(k);
                setSearch("");
                setNewTitle("");
              }}
            >
              {(() => {
                const Icone = BOOK_KIND_ICON[k];
                return (
                  <span className={"chip-tipo k-" + k}>
                    <Icone />
                  </span>
                );
              })()}
              {BOOK_KIND_INFO[k].aba}
              <span className="bday-filtro-n">{board.state.books.filter((b) => b.kind === k).length}</span>
            </button>
          ))}
        </div>

        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder={`+ Adicionar ${info.um} e pressionar Enter`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <EnviarBtn onClick={() => handleAdd()} label="Adicionar" />
          </div>
        </div>

        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder={`Buscar ${info.um} pelo título...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {BOOK_STATUS_ORDER.map((status) => {
          const books = board.state.books
            .filter((b) => b.kind === kind && b.status === status)
            .filter((b) => !searchTerm || b.title.toLowerCase().includes(searchTerm))
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          const isCollapsed = !!collapsed[status];
          const hasRows = !isCollapsed && books.length > 0;
          const GroupIcon = BOOK_STATUS_ICON[status];
          const draggable = status === "para_ler";
          return (
            <div key={status} className="list-card">
              <button
                type="button"
                className={"book-group-head" + (hasRows ? " has-rows" : "")}
                onClick={() => toggleGroup(status)}
              >
                <span className={"chevron" + (isCollapsed ? " collapsed" : "")}>
                  <ChevronIcon />
                </span>
                <span
                  className="book-group-tag"
                  style={{ "--group-color": BOOK_STATUS_COLOR[status] } as React.CSSProperties}
                >
                  <GroupIcon />
                  <span className="book-group-name">{info.grupo[status]}</span>
                </span>
                <span className="book-group-count">{books.length}</span>
              </button>
              {!isCollapsed &&
                books.map((b, idx) => (
                  <BookRow
                    key={b.id}
                    book={b}
                    draggable={draggable}
                    dragging={draggingId === b.id}
                    position={idx + 1}
                    onDragStart={draggable ? setDraggingId : undefined}
                    onDragOverRow={draggable ? setOverId : undefined}
                    onDrop={draggable ? () => handleDrop(books) : undefined}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
