import { useState, useEffect } from "react";
import { getShares, addShare, removeShare, Share, SharePermission } from "../api";

interface Props {
  documentId: string;
  onClose: () => void;
}

export default function ShareDialog({ documentId, onClose }: Props) {
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<SharePermission>("edit");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadShares = async () => {
    try {
      const data = await getShares(documentId);
      setShares(data);
    } catch (err) {
      console.error("Failed to load shares:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, [documentId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await addShare(documentId, email, permission);
      setEmail("");
      loadShares();
    } catch (err: any) {
      setError(err.message || "Failed to share");
    }
  };

  const handleRemove = async (shareId: string) => {
    try {
      await removeShare(shareId);
      loadShares();
    } catch (err) {
      console.error("Failed to remove share:", err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Share document</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <form className="share-form" onSubmit={handleAdd}>
            <input
              className="input"
              type="email"
              placeholder="Email of user to share with"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="input"
              value={permission}
              onChange={(e) => setPermission(e.target.value as SharePermission)}
              aria-label="Permission"
            >
              <option value="edit">Can edit</option>
              <option value="view">Can view</option>
            </select>
            <button className="btn btn-primary" type="submit">
              Share
            </button>
          </form>

          <p className="share-hint">
            Use "Can view" for read-only access or "Can edit" to allow updates.
          </p>

          {error && <div className="share-error">{error}</div>}

          {loading ? (
            <p className="share-empty">Loading...</p>
          ) : shares.length === 0 ? (
            <p className="share-empty">No one has been granted access yet.</p>
          ) : (
            <ul className="share-list">
              {shares.map((s) => (
                <li key={s.id} className="share-item">
                  <div className="share-user">
                    <span
                      className="user-badge"
                      style={{ background: s.user_avatar_color, width: 36, height: 36, fontSize: 15 }}
                    >
                      {s.user_name[0]}
                    </span>
                    <div>
                      <div className="share-user-info">{s.user_name}</div>
                      <div className="share-user-email">{s.user_email}</div>
                    </div>
                  </div>
                  <div className="share-user-right">
                    <span className="share-permission-badge">
                      {s.permission === "edit" ? "Can edit" : "View only"}
                    </span>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRemove(s.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
