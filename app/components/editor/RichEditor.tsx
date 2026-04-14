"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

const mono = "var(--font-space-mono), monospace";

// ─── Toolbar button ────────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active ? "#D85A30" : "#888780",
        borderRadius: "2px",
        transition: "color 0.1s",
      }}
    >
      {children}
    </button>
  );
}

// ─── Icons (inline SVG to avoid a dependency) ─────────────────────────────────

const icons = {
  bold: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 2h5a3 3 0 0 1 0 6H3V2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
      <path d="M3 8h5.5a3 3 0 0 1 0 6H3V8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  italic: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="8" y1="2" x2="5" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5" y1="2" x2="10" y2="2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="4" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  h2: (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="12" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="ui-monospace, monospace">H2</text>
    </svg>
  ),
  h3: (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="12" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="ui-monospace, monospace">H3</text>
    </svg>
  ),
  quote: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="4" height="5" rx="0.5" fill="currentColor" fillOpacity="0.7" />
      <rect x="8" y="2" width="4" height="5" rx="0.5" fill="currentColor" fillOpacity="0.7" />
      <line x1="2" y1="9.5" x2="6" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="9.5" x2="12" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  ul: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="2" cy="4" r="1" fill="currentColor" />
      <circle cx="2" cy="8" r="1" fill="currentColor" />
      <circle cx="2" cy="12" r="1" fill="currentColor" />
      <line x1="5" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  hr: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="1" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  ),
};

// ─── Editor ───────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

export function RichEditor({ value, onChange, minHeight = 320 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder: "escribe lo que quieras..." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        style: `min-height:${minHeight}px; outline:none; padding:16px; font-family:var(--font-space-mono),monospace; font-size:14px; color:#e8e4dc; line-height:1.85; word-break:break-word;`,
      },
    },
  });

  if (!editor) return null;

  const toolbar: Array<{ key: string; title: string; icon: React.ReactNode; active: boolean; action: () => void }> = [
    {
      key: "bold", title: "Negrita", icon: icons.bold,
      active: editor.isActive("bold"),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: "italic", title: "Cursiva", icon: icons.italic,
      active: editor.isActive("italic"),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: "h2", title: "Encabezado 2", icon: icons.h2,
      active: editor.isActive("heading", { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "h3", title: "Encabezado 3", icon: icons.h3,
      active: editor.isActive("heading", { level: 3 }),
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      key: "quote", title: "Cita", icon: icons.quote,
      active: editor.isActive("blockquote"),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      key: "ul", title: "Lista", icon: icons.ul,
      active: editor.isActive("bulletList"),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: "hr", title: "Separador", icon: icons.hr,
      active: false,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "#141412",
        border: "0.5px solid #2a2a28",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          padding: "6px 10px",
          borderBottom: "0.5px solid #2a2a28",
        }}
      >
        {toolbar.map((btn) => (
          <ToolBtn key={btn.key} active={btn.active} onClick={btn.action} title={btn.title}>
            {btn.icon}
          </ToolBtn>
        ))}
      </div>

      {/* Content */}
      <EditorContent editor={editor} />

      {/* Prose styles injected as a global style tag */}
      <style>{`
        .rich-editor-content h2 {
          font-family: var(--font-syne), sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #e8e4dc;
          margin: 20px 0 8px;
          line-height: 1.2;
        }
        .rich-editor-content h3 {
          font-family: var(--font-syne), sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #e8e4dc;
          margin: 16px 0 6px;
          line-height: 1.2;
        }
        .rich-editor-content strong { color: #e8e4dc; font-weight: 700; }
        .rich-editor-content em { color: #c0bdb5; }
        .rich-editor-content blockquote {
          border-left: 2px solid #7F77DD;
          padding-left: 14px;
          margin: 12px 0;
          color: #888780;
          font-style: italic;
        }
        .rich-editor-content ul {
          padding-left: 18px;
          list-style-type: disc;
          margin: 8px 0;
          color: #888780;
        }
        .rich-editor-content li { margin: 4px 0; }
        .rich-editor-content hr {
          border: none;
          border-top: 0.5px solid #2a2a28;
          margin: 20px 0;
        }
        .rich-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #444441;
          font-family: var(--font-space-mono), monospace;
          font-size: 14px;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .rich-editor-content p { margin: 0 0 8px; }
        .rich-editor-content p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
