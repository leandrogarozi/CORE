"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  LinkIcon,
  RtAlignCenterIcon,
  RtAlignJustifyIcon,
  RtAlignLeftIcon,
  RtAlignRightIcon,
  RtBoldIcon,
  RtBulletListIcon,
  RtItalicIcon,
  RtStrikethroughIcon,
  RtTaskListIcon,
  RtUnderlineIcon,
} from "./icons";

// Editor de texto rico (negrito/itálico/sublinhado/tachado, títulos, lista, checklist,
// alinhamento, link) — guarda e devolve o conteúdo como HTML. Usado em todo campo de
// observação/resumo/nota do app (lembretes, tarefas, projetos, livros...).
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
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
      <div className="rte-toolbar">
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
    </div>
  );
}
