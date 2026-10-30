"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor, Extension, Node as TiptapNode, mergeAttributes } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { MicButton } from "./MicButton";
import {
  LinkIcon,
  RtAlignCenterIcon,
  RtAlignJustifyIcon,
  RtAlignLeftIcon,
  RtAlignRightIcon,
  RtBoldIcon,
  RtBulletListIcon,
  RtHighlightIcon,
  RtItalicIcon,
  RtOrderedListIcon,
  RtQuoteIcon,
  RtStrikethroughIcon,
  RtThoughtIcon,
  RtTaskListIcon,
  RtUnderlineIcon,
} from "./icons";

/**
 * Bloco de PENSAMENTO: um recado de quem escreve para si mesmo (o que passou pela
 * cabeça, a dúvida, a ideia solta), separado do resto do texto. É o irmão da
 * citação: a citação destaca a fala de OUTRA pessoa; o pensamento, a SUA.
 * Guardado como `<div data-tipo="pensamento">`, que o editor volta a reconhecer
 * ao abrir e o exportador de Markdown (html-para-markdown) vira "> 💭 ...".
 */
const Pensamento = TiptapNode.create({
  name: "pensamento",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-tipo="pensamento"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-tipo": "pensamento", class: "rte-pensamento" }), 0];
  },
});

// Paleta de destaque (mesma ideia do ClickUp): cor de fundo aplicada ao texto selecionado.
const HIGHLIGHT_COLORS = [
  { v: "#fbcfe8", l: "Rosa" },
  { v: "#fed7aa", l: "Laranja" },
  { v: "#fef08a", l: "Amarelo" },
  { v: "#bfdbfe", l: "Azul" },
  { v: "#ddd6fe", l: "Roxo" },
  { v: "#fecaca", l: "Vermelho" },
  { v: "#bbf7d0", l: "Verde" },
  { v: "#e5e7eb", l: "Cinza" },
];

function HighlightMenu({
  anchorRect,
  onPick,
  onRemove,
  onClose,
}: {
  anchorRect: DOMRect;
  onPick: (color: string) => void;
  onRemove: () => void;
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
    <div className="rte-highlight-menu" ref={ref} style={{ top: pos.top, left: pos.left }}>
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.v}
          type="button"
          className="rte-highlight-swatch"
          title={c.l}
          style={{ background: c.v }}
          onClick={() => {
            onPick(c.v);
            onClose();
          }}
        />
      ))}
      <button
        type="button"
        className="rte-highlight-swatch rte-highlight-none"
        title="Remover cor"
        onClick={() => {
          onRemove();
          onClose();
        }}
      >
        ⊘
      </button>
    </div>,
    document.body
  );
}

// Editor de texto rico (negrito/itálico/sublinhado/tachado, títulos, lista, checklist,
// alinhamento, link) — guarda e devolve o conteúdo como HTML. Usado em todo campo de
// observação/resumo/nota do app (lembretes, tarefas, projetos, livros...).
// Quanto a barra flutuante fica abaixo do topo da tela (px). Foi 6; o Leandro pediu
// "uns dois dedinhos" mais para baixo, e dois dedos são uns 60 px.
const DISTANCIA_DO_TOPO = 66;
// Dentro de uma caixa com rolagem própria (o pop-up de anotação) a barra gruda perto do topo da caixa.
const DISTANCIA_NA_CAIXA = 8;

interface PosicaoFixa {
  top: number;
  left: number;
  width: number;
  altura: number;
}

interface EstadoDaBarra {
  /** "fixa": sobre a página (position: fixed). "colada": dentro de uma caixa que rola (position: sticky). */
  modo: "normal" | "fixa" | "colada";
  /** A barra está de fato acompanhando a tela (ganha borda e sombra). */
  seguindo: boolean;
  posicao: PosicaoFixa | null;
}

const NORMAL: EstadoDaBarra = { modo: "normal", seguindo: false, posicao: null };

/** O ancestral que rola na vertical de verdade (um pop-up, por exemplo); null = a própria página. */
function ancestralQueRola(el: HTMLElement): HTMLElement | null {
  let atual = el.parentElement;
  while (atual && atual !== document.body) {
    const { overflowY } = getComputedStyle(atual);
    if ((overflowY === "auto" || overflowY === "scroll") && atual.scrollHeight > atual.clientHeight + 1) return atual;
    atual = atual.parentElement;
  }
  return null;
}

function mesmoEstado(a: EstadoDaBarra, b: EstadoDaBarra): boolean {
  if (a.modo !== b.modo || a.seguindo !== b.seguindo) return false;
  if (!a.posicao || !b.posicao) return a.posicao === b.posicao;
  return (
    a.posicao.top === b.posicao.top &&
    a.posicao.left === b.posicao.left &&
    a.posicao.width === b.posicao.width &&
    a.posicao.altura === b.posicao.altura
  );
}

/**
 * Barra de formatação que ACOMPANHA a tela: quando o texto é comprido e a barra
 * já saiu por cima, ela fica presa no topo enquanto o editor ainda estiver à
 * vista. Quem escreve texto longo não precisa mais subir só para pôr um negrito
 * ou um marca-texto.
 *
 * Dois jeitos, conforme onde o editor está:
 *  - Sobre a página: `position: fixed`, com a posição calculada. Não dá para usar
 *    `sticky` porque o editor vive dentro de tabelas com rolagem horizontal e de
 *    caixas com `overflow`, onde o sticky não pega.
 *  - Dentro de uma caixa que rola (o pop-up de anotação): `position: sticky`.
 *    Ali o `fixed` não serve: o pop-up é centralizado com `transform`, e dentro
 *    de um `transform` o `fixed` deixa de ser da tela e a barra sumia.
 */
function useBarraFlutuante(
  raiz: React.RefObject<HTMLDivElement | null>,
  barra: React.RefObject<HTMLDivElement | null>,
  ativa: boolean,
  // O editor só aparece depois que o Tiptap carrega; até lá os refs estão vazios.
  pronto: boolean
): EstadoDaBarra {
  const [estado, setEstado] = useState<EstadoDaBarra>(NORMAL);

  useEffect(() => {
    const el = raiz.current;
    const bar = barra.current;
    if (!ativa || !pronto || !el || !bar) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- desliga a barra flutuante quando a barra some
      setEstado(NORMAL);
      return;
    }
    let quadro = 0;

    function atualizar() {
      quadro = 0;
      if (!el || !bar) return;
      const altura = bar.offsetHeight || 40;
      const caixa = el.getBoundingClientRect();
      const pai = ancestralQueRola(el);
      let proximo: EstadoDaBarra;
      if (pai) {
        const limite = pai.getBoundingClientRect().top + DISTANCIA_NA_CAIXA;
        // Colada (sticky) o tempo todo; "seguindo" só quando já saiu do lugar de origem.
        proximo = { modo: "colada", seguindo: caixa.top < limite - 1 && caixa.bottom > limite + altura + 48, posicao: null };
      } else {
        const limite = DISTANCIA_DO_TOPO;
        // Só flutua se a barra já passou do topo e ainda sobra editor à vista embaixo dela.
        const deve = caixa.top < limite && caixa.bottom > limite + altura + 48;
        proximo = deve
          ? { modo: "fixa", seguindo: true, posicao: { top: limite, left: caixa.left, width: caixa.width, altura } }
          : NORMAL;
      }
      setEstado((atual) => (mesmoEstado(atual, proximo) ? atual : proximo));
    }
    function agendar() {
      if (!quadro) quadro = requestAnimationFrame(atualizar);
    }

    // `true` (captura): pega a rolagem da página e a de qualquer caixa com rolagem.
    window.addEventListener("scroll", agendar, true);
    window.addEventListener("resize", agendar);
    agendar();
    return () => {
      window.removeEventListener("scroll", agendar, true);
      window.removeEventListener("resize", agendar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [raiz, barra, ativa, pronto]);

  return ativa ? estado : NORMAL;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  hideToolbar = false,
  maxChars,
  onLimit,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  // Limite de caracteres de texto (sem formatação). Quem digita ou cola além dele é barrado, nada é cortado
  // em silêncio; `onLimit` avisa a tela. Texto que já passa do limite continua podendo ser lido e apagado.
  maxChars?: number;
  onLimit?: () => void;
  // No campo de observação inline a barra só aparece quando o campo tem foco.
  hideToolbar?: boolean;
}) {
  const [highlightAnchor, setHighlightAnchor] = useState<DOMRect | null>(null);
  // Último HTML que ESTE editor produziu — serve pra distinguir "o texto mudou
  // porque eu digitei" de "o texto mudou porque abriram outro item".
  const ultimoEmitido = useRef(value);
  const highlightBtnRef = useRef<HTMLButtonElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const limiteRef = useRef({ maxChars, onLimit });
  useEffect(() => {
    limiteRef.current = { maxChars, onLimit };
  }, [maxChars, onLimit]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Pensamento,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      // O filtro lê o limite de um ref só quando o usuário digita, nunca durante a renderização.
      // eslint-disable-next-line react-hooks/refs
      Extension.create({
        name: "limiteDeCaracteres",
        addProseMirrorPlugins() {
          return [
            new Plugin({
              filterTransaction: (tr, state) => {
                const { maxChars: max, onLimit: avisar } = limiteRef.current;
                // Troca de conteúdo vinda de fora (abrir outro item) não é digitação: passa sempre.
                if (!max || !tr.docChanged || tr.getMeta("preventUpdate")) return true;
                const conta = (d: typeof tr.doc) => d.textBetween(0, d.content.size, "\n", " ").length;
                const novo = conta(tr.doc);
                if (novo <= max || novo <= conta(state.doc)) return true;
                avisar?.();
                return false;
              },
            }),
          ];
        },
      }),
    ],
    content: value,
    autofocus: autoFocus ? "end" : false,
    editorProps: { attributes: { class: "rte-content" } },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      ultimoEmitido.current = html;
      onChange(html);
    },
  });

  const barra = useBarraFlutuante(raizRef, barraRef, !hideToolbar, !!editor);

  // Recarregar o conteúdo só quando o texto vem DE FORA (trocou de lembrete,
  // de tarefa). Antes a comparação era só `value !== editor.getHTML()`, e como
  // o HTML que o editor devolve é normalizado (nem sempre idêntico ao que veio
  // guardado), o setContent disparava a cada renderização — apagando a
  // seleção e a marca pendente. Era isso que fazia o negrito "sair sozinho" e
  // aparecer onde não devia.
  useEffect(() => {
    if (!editor) return;
    if (value === ultimoEmitido.current) return; // veio da nossa própria digitação
    if (value === editor.getHTML()) return;
    ultimoEmitido.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  function setLink() {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("URL do link", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  // Insere a fala no ponto do cursor. O espaço no fim evita que a próxima
  // frase venha colada na anterior.
  function ditar(texto: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(`${texto} `).run();
  }

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  return (
    <div className="rte" ref={raizRef}>
      {/* Segura o lugar da barra enquanto ela está flutuando, para o texto não pular. */}
      {barra.modo === "fixa" && barra.posicao && <div style={{ height: barra.posicao.altura }} aria-hidden="true" />}
      {/* preventDefault no mousedown: sem isso, clicar num botão tira o foco do
          editor — o que fecharia a barra no modo "aparece só com foco". */}
      <div
        ref={barraRef}
        className={
          "rte-toolbar" + (barra.modo === "colada" ? " colada" : "") + (barra.seguindo ? " flutuando" : "")
        }
        style={
          barra.modo === "fixa" && barra.posicao
            ? { position: "fixed", top: barra.posicao.top, left: barra.posicao.left, width: barra.posicao.width }
            : undefined
        }
        hidden={hideToolbar}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("bold") ? " active" : "")}
          title="Negrito"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <RtBoldIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("italic") ? " active" : "")}
          title="Itálico"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <RtItalicIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("underline") ? " active" : "")}
          title="Sublinhado"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <RtUnderlineIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("strike") ? " active" : "")}
          title="Tachado"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <RtStrikethroughIcon />
        </button>
        <button
          ref={highlightBtnRef}
          type="button"
          className={"rte-btn" + (editor.isActive("highlight") ? " active" : "")}
          title="Destaque"
          onClick={() => setHighlightAnchor(highlightBtnRef.current?.getBoundingClientRect() ?? null)}
        >
          <RtHighlightIcon />
        </button>
        <span className="rte-sep" />
        <select
          className="rte-select"
          title="Estilo de texto"
          value={headingValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="p">Texto</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
        </select>
        <span className="rte-sep" />
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("bulletList") ? " active" : "")}
          title="Lista"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <RtBulletListIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("orderedList") ? " active" : "")}
          title="Lista numerada"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <RtOrderedListIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("taskList") ? " active" : "")}
          title="Checklist"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <RtTaskListIcon />
        </button>
        <span className="rte-sep" />
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("blockquote") ? " active" : "")}
          title="Citação: destaca uma frase de alguém"
          aria-label="Citação"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <RtQuoteIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("pensamento") ? " active" : "")}
          title="Pensamento: destaca o que passou pela sua cabeça"
          aria-label="Pensamento"
          onClick={() => editor.chain().focus().toggleWrap("pensamento").run()}
        >
          <RtThoughtIcon />
        </button>
        <span className="rte-sep" />
        <button
          type="button"
          className={"rte-btn" + (editor.isActive({ textAlign: "left" }) ? " active" : "")}
          title="Alinhar à esquerda"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <RtAlignLeftIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive({ textAlign: "center" }) ? " active" : "")}
          title="Centralizar"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <RtAlignCenterIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive({ textAlign: "right" }) ? " active" : "")}
          title="Alinhar à direita"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <RtAlignRightIcon />
        </button>
        <button
          type="button"
          className={"rte-btn" + (editor.isActive({ textAlign: "justify" }) ? " active" : "")}
          title="Justificar"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <RtAlignJustifyIcon />
        </button>
        <span className="rte-sep" />
        <button
          type="button"
          className={"rte-btn" + (editor.isActive("link") ? " active" : "")}
          title="Link"
          onClick={setLink}
        >
          <LinkIcon />
        </button>
        <span className="rte-sep" />
        {/* Ditar escreve onde o cursor está, como se estivesse digitando —
            então dá pra falar um trecho, corrigir na mão e voltar a falar. */}
        <MicButton className="rte-btn" onText={ditar} ariaLabel="Ditar o texto" />
      </div>
      <EditorContent editor={editor} className="rte-editor" />
      {highlightAnchor &&
        (() => {
          const anchor = highlightAnchor;
          return (
            <HighlightMenu
              anchorRect={anchor}
              onPick={(color) => editor.chain().focus().setHighlight({ color }).run()}
              onRemove={() => editor.chain().focus().unsetHighlight().run()}
              onClose={() => setHighlightAnchor(null)}
            />
          );
        })()}
    </div>
  );
}
