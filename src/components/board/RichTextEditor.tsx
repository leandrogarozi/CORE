"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
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
  RtStrikethroughIcon,
  RtTaskListIcon,
  RtUnderlineIcon,
} from "./icons";

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
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  hideToolbar = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  // No campo de observação inline a barra só aparece quando o campo tem foco.
  hideToolbar?: boolean;
}) {
  const [highlightAnchor, setHighlightAnchor] = useState<DOMRect | null>(null);
  const highlightBtnRef = useRef<HTMLButtonElement>(null);

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
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    autofocus: autoFocus ? "end" : false,
    editorProps: { attributes: { class: "rte-content" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
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

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  return (
    <div className="rte">
      {/* preventDefault no mousedown: sem isso, clicar num botão tira o foco do
          editor — o que fecharia a barra no modo "aparece só com foco". */}
      <div
        className="rte-toolbar"
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
