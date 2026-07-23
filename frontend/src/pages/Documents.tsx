import { useState, useEffect, useRef } from "react";
import {
  getDocuments,
  createDocument,
  deleteDocument,
  uploadFile,
  Document,
} from "../api";
import ShareDialog from "../components/ShareDialog";

interface Props {
  userName: string;
  onLogout: () => void;
  onSelectDoc: (id: string) => void;
}

export default function Documents({ userName, onLogout, onSelectDoc }: Props) {
  const [owned, setOwned] = useState<Document[]>([]);
  const [shared, setShared] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    try {
      setError("");
      const data = await getDocuments();
      setOwned(data.owned);
      setShared(data.shared);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleCreate = async () => {
    try {
      setError("");
      const doc = await createDocument("Untitled", "<p></p>");
      onSelectDoc(doc.id);
    } catch (err: any) {
      setError(err.message || "Failed to create document");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this document?")) return;
    try {
      setError("");
      await deleteDocument(id);
      loadDocs();
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      const doc = await uploadFile(file);
      onSelectDoc(doc.id);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return `Today at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const DocCard = ({ doc, isShared }: { doc: Document; isShared?: boolean }) => (
    <div className="doc-card" onClick={() => onSelectDoc(doc.id)}>
      <div className="doc-card-preview">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
        </svg>
        {!isShared && (
          <div className="doc-card-actions">
            <button
              className="doc-card-action"
              onClick={(e) => {
                e.stopPropagation();
                setShareDocId(doc.id);
              }}
              title="Share"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.05 4.11c-.05.23-.09.47-.09.7 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </button>
            <button
              className="doc-card-action"
              onClick={(e) => handleDelete(e, doc.id)}
              title="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="doc-card-body">
        <div className="doc-card-title">{doc.title}</div>
        <div className="doc-card-meta">
          {isShared ? `Shared by ${doc.owner_name}` : `Edited ${formatDate(doc.updated_at)}`}
        </div>
        {isShared && (
          <div className="doc-card-shared">
            {doc.share_permission === "view" ? "View only" : "Can edit"}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">D</div>
            Ajaia Docs
          </div>
        </div>
        <div className="header-right">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
            Upload
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New
          </button>
          <div className="user-menu">
            <button
              className="user-badge"
              style={{ background: "#1a73e8" }}
              onClick={() => setShowUserMenu((v) => !v)}
              title={userName}
            >
              {userName[0]}
            </button>
            {showUserMenu && (
              <>
                <div className="user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                <div className="user-menu-dropdown">
                  <div className="user-menu-name">Signed in as {userName}</div>
                  <button className="user-menu-signout" onClick={onLogout}>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="doc-list-page">
        <div className="doc-list-header">
          <h1 className="doc-list-title">Documents</h1>
        </div>

        <p className="doc-list-upload-hint">
          Upload supports .txt and .md files.
        </p>

        {error && <div className="doc-list-error">{error}</div>}

        {loading ? (
          <div className="loading-state">Loading your documents...</div>
        ) : (
          <>
            {owned.length > 0 && (
              <div className="doc-section">
                <div className="doc-section-title">My Documents</div>
                <div className="doc-grid">
                  {owned.map((doc) => (
                    <DocCard key={doc.id} doc={doc} />
                  ))}
                </div>
              </div>
            )}

            {shared.length > 0 && (
              <div className="doc-section">
                <div className="doc-section-title">Shared with Me</div>
                <div className="doc-grid">
                  {shared.map((doc) => (
                    <DocCard key={doc.id} doc={doc} isShared />
                  ))}
                </div>
              </div>
            )}

            {owned.length === 0 && shared.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                  </svg>
                </div>
                <div className="empty-state-text">
                  No documents yet. Create one to get started.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {shareDocId && (
        <ShareDialog
          documentId={shareDocId}
          onClose={() => setShareDocId(null)}
        />
      )}
    </div>
  );
}
