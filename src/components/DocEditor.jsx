import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function DocEditor({ content, onChange, editable = true, darkMode = false }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  // Keep editor content synced if content prop changes externally
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  // Keep editable state synced
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) return null;

  const cardBg = darkMode ? "#1E140C" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#E8D9C5";
  const textMuted = darkMode ? "#B3A18C" : "#9C8B76";
  const textColor = darkMode ? "#FFF8EF" : "#2E2013";

  const btnStyle = (isActive) => ({
    padding: "6px 10px",
    borderRadius: "6px",
    border: `1px solid ${isActive ? '#f15e1c' : borderCol}`,
    background: isActive ? (darkMode ? "rgba(241, 94, 28, 0.25)" : "#FFF3E2") : (darkMode ? "#2E2013" : "#FFF8EF"),
    color: isActive ? "#f15e1c" : textColor,
    fontWeight: isActive ? "700" : "500",
    fontSize: "12.5px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
  });

  return (
    <div style={{
      background: cardBg,
      borderRadius: "16px",
      border: `1px solid ${borderCol}`,
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
    }}>
      {/* Editor Toolbar (only shown if editable) */}
      {editable && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "12px 16px",
          borderBottom: `1px solid ${borderCol}`,
          background: darkMode ? "rgba(255,255,255,0.02)" : "#FFF8EF"
        }}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={btnStyle(editor.isActive('bold'))}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={btnStyle(editor.isActive('italic'))}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            style={btnStyle(editor.isActive('strike'))}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            style={btnStyle(editor.isActive('code'))}
            title="Inline Code"
          >
            <code>&lt;/&gt;</code>
          </button>

          <div style={{ width: "1px", height: "24px", background: borderCol, margin: "0 4px" }} />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            style={btnStyle(editor.isActive('heading', { level: 1 }))}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            style={btnStyle(editor.isActive('heading', { level: 2 }))}
            title="Heading 2"
          >
            H2
          </button>

          <div style={{ width: "1px", height: "24px", background: borderCol, margin: "0 4px" }} />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            style={btnStyle(editor.isActive('bulletList'))}
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            style={btnStyle(editor.isActive('orderedList'))}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            style={btnStyle(editor.isActive('blockquote'))}
            title="Quote"
          >
            “ Quote
          </button>

          <div style={{ width: "1px", height: "24px", background: borderCol, margin: "0 4px" }} />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            style={{ ...btnStyle(false), opacity: editor.can().undo() ? 1 : 0.4 }}
            title="Undo"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            style={{ ...btnStyle(false), opacity: editor.can().redo() ? 1 : 0.4 }}
            title="Redo"
          >
            ↪ Redo
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div style={{ padding: "24px", minHeight: "360px", color: textColor, fontSize: "15px", lineHeight: "1.7" }}>
        <EditorContent editor={editor} />
      </div>

      {/* Custom Styling for Tiptap Editor Content */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 320px;
        }
        .ProseMirror h1 {
          font-size: 22px;
          font-weight: 800;
          margin-top: 16px;
          margin-bottom: 10px;
          color: ${darkMode ? "#FFF8EF" : "#2E2013"};
        }
        .ProseMirror h2 {
          font-size: 18px;
          font-weight: 700;
          margin-top: 14px;
          margin-bottom: 8px;
          color: ${darkMode ? "#E8D9C5" : "#1E140C"};
        }
        .ProseMirror p {
          margin-bottom: 12px;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #f15e1c;
          padding-left: 14px;
          margin-left: 0;
          color: ${textMuted};
          font-style: italic;
        }
        .ProseMirror code {
          background: ${darkMode ? "rgba(255,255,255,0.08)" : "#FFF3E2"};
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 13.5px;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 20px;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}
