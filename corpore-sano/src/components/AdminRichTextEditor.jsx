import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState } from "react";

import "../style/postRichContent.css";

function ToolbarButton({ active, disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`admin-rich-toolbar__btn${active ? " admin-rich-toolbar__btn--active" : ""}`}
    >
      {children}
    </button>
  );
}

/**
 * TipTap-based rich text for internal posts (HTML stored in DB).
 * Remount via `mountKey` when loading a different post so `initialHtml` applies.
 * @param {{ mountKey: string, initialHtml: string, onChange: (html: string) => void, placeholder?: string, disabled?: boolean, label: string }} props
 */
export default function AdminRichTextEditor({
  mountKey,
  initialHtml,
  onChange,
  placeholder = "",
  disabled = false,
  label,
}) {
  const [, setTick] = useState(0);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
          },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder],
  );

  const editor = useEditor(
    {
      extensions,
      content: initialHtml || "",
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        onChangeRef.current(ed.getHTML());
      },
      editorProps: {
        attributes: {
          class: "tiptap admin-rich-editor__prose focus:outline-none",
          spellcheck: "true",
        },
      },
    },
    [mountKey],
  );

  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => setTick((n) => n + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className="admin-rich-editor-wrapper admin-rich-editor-wrapper--loading">
        <p className="text-sm text-[#4d515c] dark:text-[#8ea0b5]">{label}</p>
      </div>
    );
  }

  function setLink() {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("Link URL (https://…)", prev || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }

  return (
    <div className="admin-rich-editor-wrapper">
      <p className="mb-1 text-sm font-semibold text-[#103152] dark:text-[#e8ecf1]">{label}</p>
      <div
        className="admin-rich-toolbar flex flex-wrap gap-1 rounded-t-md border border-b-0 border-[#e1e5ec] bg-[#eef2f7] p-1 dark:border-[#2a3441] dark:bg-[#121a22]"
        role="toolbar"
        aria-label="Formatting"
      >
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-[#c5cdd8] dark:bg-[#3d4a5c]" aria-hidden />
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-[#c5cdd8] dark:bg-[#3d4a5c]" aria-hidden />
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-[#c5cdd8] dark:bg-[#3d4a5c]" aria-hidden />
        <ToolbarButton title="Link" disabled={disabled} onClick={setLink}>
          Link
        </ToolbarButton>
        <ToolbarButton
          title="Undo"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          Undo
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          Redo
        </ToolbarButton>
      </div>
      <div className="admin-rich-editor__surface rounded-b-md border border-[#e1e5ec] bg-white dark:border-[#2a3441] dark:bg-[#161d27]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
