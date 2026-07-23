import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { getDocument, updateDocument, Document } from "../api";
import ShareDialog from "../components/ShareDialog";
import Toolbar from "../components/Toolbar";

interface Props {
  docId: string;
  userName: string;
  onBack: () => void;
}

export default function Editor({ docId, userName, onBack }: Props) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingContent = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
    ],
    content: "",
    editable: true,
    onUpdate: ({ editor: ed }) => {
      // setContent() can trigger internal normalization transactions (e.g.
      // schema coercion) that also fire onUpdate; ignore those so opening a
      // document for viewing never overwrites its stored content.
      if (isLoadingContent.current) return;
      if (contentTimer.current) clearTimeout(contentTimer.current);
      contentTimer.current = setTimeout(() => {
        saveContent(ed.getHTML());
      }, 800);
    },
  });

  const saveContent = useCallback(
    async (html: string) => {
      if (!doc) return;
      setSaving(true);
      try {
        setError("");
        await updateDocument(doc.id, { content: html });
        setLastSaved(new Date());
      } catch (err: any) {
        setError(err.message || "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [doc]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const data = await getDocument(docId);
        const currentUserId = localStorage.getItem("userId");
        const owner = currentUserId === data.owner_id;
        const editable = owner || data.permission === "edit" || !data.permission;

        setDoc(data);
        setTitle(data.title);
        setCanEdit(editable);
        setIsOwner(owner);

        if (editor) {
          isLoadingContent.current = true;
          editor.commands.setContent(data.content || "<p></p>");
          editor.setEditable(editable);
          editor.commands.focus("end");
          isLoadingContent.current = false;
        }
      } catch (err: any) {
        setError(err.message || "Failed to load document");
      }
    };
    load();
  }, [docId, editor]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      if (doc) {
        try {
          setError("");
          await updateDocument(doc.id, { title: value });
          setLastSaved(new Date());
        } catch (err: any) {
          setError(err.message || "Failed to update title");
        }
      }
    }, 500);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  if (!doc) {
    return (
      <div className="editor-page">
        <div className="editor-header">
          <button className="editor-back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <div className="editor-wordmark">Ajaia Docs</div>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {error ? "Unable to open document" : "Loading..."}
          </span>
        </div>
        {error && (
          <div style={{ padding: 32 }}>
            <p style={{ color: "var(--danger)", fontSize: 14 }}>{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="editor-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div className="editor-wordmark">Ajaia Docs</div>
        <input
          className="editor-title-input"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={!canEdit}
          placeholder="Untitled"
        />
        <div className="editor-header-right">
          {!isOwner && (
            <span className="editor-share-badge">
              Shared by {doc.owner_name}
            </span>
          )}
          {isOwner && (
            <button className="btn btn-sm" onClick={() => setShowShare(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.05 4.11c-.05.23-.09.47-.09.7 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              Share
            </button>
          )}
        </div>
      </div>

      {canEdit && <Toolbar editor={editor} />}

      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>

      <div className="editor-status">
        {error && <span className="editor-status-error">{error}</span>}
        {!canEdit && <span>View-only access</span>}
        {saving && <span className="editor-status-saving">Saving...</span>}
        {!saving && lastSaved && (
          <span className="editor-status-saved">Saved at {formatTime(lastSaved)}</span>
        )}
        {!canEdit && <span className="ml-auto" onClick={() => setShowShare(true)}>Request edit access</span>}
      </div>

      {showShare && (
        <ShareDialog
          documentId={doc.id}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
