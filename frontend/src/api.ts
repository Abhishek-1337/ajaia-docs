const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error && typeof data.error === "string") return data.error;
  } catch {
    // Ignore parse errors and use fallback.
  }
  return fallback;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  owner_name: string;
  owner_avatar_color: string;
  created_at: string;
  updated_at: string;
  permission?: string;
  share_permission?: string;
}

export interface Share {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar_color: string;
  permission: string;
  created_at: string;
}

export type SharePermission = "view" | "edit";

function getHeaders(): Record<string, string> {
  const userId = localStorage.getItem("userId");
  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
  };
}

export async function login(email: string): Promise<User> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Login failed");
  }
  return res.json();
}

export async function getDocuments(): Promise<{
  owned: Document[];
  shared: Document[];
}> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to fetch documents"));
  return res.json();
}

export async function getDocument(id: string): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to fetch document"));
  return res.json();
}

export async function createDocument(title?: string, content?: string): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to create document"));
  return res.json();
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: string }
): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to update document"));
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to delete document"));
}

export async function getShares(documentId: string): Promise<Share[]> {
  const res = await fetch(`${API_BASE}/shares/${documentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to fetch shares"));
  return res.json();
}

export async function addShare(
  documentId: string,
  userEmail: string,
  permission: SharePermission = "edit"
): Promise<void> {
  const res = await fetch(`${API_BASE}/shares`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      document_id: documentId,
      user_email: userEmail,
      permission,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to share document");
  }
}

export async function removeShare(shareId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/shares/${shareId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to remove share"));
}

export async function uploadFile(file: File): Promise<Document> {
  const userId = localStorage.getItem("userId");
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: userId ? { "x-user-id": userId } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to fetch users"));
  return res.json();
}
