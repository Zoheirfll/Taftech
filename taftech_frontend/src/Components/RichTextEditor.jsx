import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, LinkIcon, Unlink, Quote,
} from "lucide-react";
import { tw } from "../theme";

const ToolbarButton = ({ onClick, active, children, title }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className={`p-2 rounded-lg transition-colors ${active ? "bg-teal-100 text-teal-700" : `${tw.textMuted} hover:bg-slate-100`}`}
  >
    {children}
  </button>
);

// Éditeur WYSIWYG minimal (TipTap) pour le contenu des articles de blog — sortie HTML brute,
// sanitizée côté backend (bleach) à la sauvegarde en défense en profondeur.
const RichTextEditor = ({ value, onChange, placeholder = "Rédigez votre article..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[240px] px-4 py-3 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("URL du lien :", editor.getAttributes("link").href || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className={`border ${tw.borderBase} rounded-xl overflow-hidden`}>
      <div className={`flex items-center gap-1 px-2 py-1.5 border-b ${tw.borderSubtle} ${tw.surfaceMuted} flex-wrap`}>
        <ToolbarButton title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
        <ToolbarButton title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
        <ToolbarButton title="Titre 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarButton>
        <ToolbarButton title="Titre 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolbarButton>
        <ToolbarButton title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
        <ToolbarButton title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton title="Citation" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolbarButton>
        <ToolbarButton title="Lien" active={editor.isActive("link")} onClick={setLink}><LinkIcon size={15} /></ToolbarButton>
        {editor.isActive("link") && (
          <ToolbarButton title="Retirer le lien" onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={15} /></ToolbarButton>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
