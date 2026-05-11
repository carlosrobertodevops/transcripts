"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Mark, mergeAttributes } from "@tiptap/core";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Link2, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ColoredBold = Mark.create({
  name: "boldColored",
  addOptions() {
    return { HTMLAttributes: {} };
  },
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.color || null,
        renderHTML: (attrs: { color?: string | null }) =>
          attrs.color ? { style: `color:${attrs.color};font-weight:700` } : {},
      },
    };
  },
  parseHTML() {
    return [
      { tag: "strong[style*='color']" },
      { tag: "b[style*='color']" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["strong", mergeAttributes(HTMLAttributes), 0];
  },
});

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  bodyClassName?: string;
}

export const RichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Escreva...",
  className,
  bodyClassName,
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: { HTMLAttributes: { class: "text-sm leading-relaxed" } },
        heading: { levels: [1, 2] },
        bulletList: { HTMLAttributes: { class: "list-disc list-inside space-y-1" } },
        orderedList: { HTMLAttributes: { class: "list-decimal list-inside space-y-1" } },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      ColoredBold,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-3 bg-background border border-input rounded-md text-sm",
          bodyClassName,
        ),
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  if (!editor) return null;

  const ToolbarButton = ({ icon: Icon, onClick, active, title }: any) => (
    <button
      onClick={onClick}
      className={`p-2 rounded transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
      title={title}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div
      className={cn(
        "border border-input rounded-lg overflow-hidden flex flex-col min-h-0",
        className,
      )}
    >
      <div className="flex gap-1 p-2 bg-muted border-b border-input flex-wrap">
        <ToolbarButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito" />
        <ToolbarButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico" />
        <div className="w-px bg-input" />
        <ToolbarButton icon={Heading1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1" />
        <ToolbarButton icon={Heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2" />
        <div className="w-px bg-input" />
        <ToolbarButton icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list" />
        <ToolbarButton icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list" />
        <div className="w-px bg-input" />
        <ToolbarButton
          icon={Link2}
          onClick={() => {
            const url = prompt("URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title="Link"
        />
        <div className="w-px bg-input" />
        <ToolbarButton icon={Undo2} onClick={() => editor.chain().focus().undo().run()} title="Undo" />
        <ToolbarButton icon={Redo2} onClick={() => editor.chain().focus().redo().run()} title="Redo" />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};
