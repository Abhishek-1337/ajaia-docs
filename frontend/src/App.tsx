import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Documents from "./pages/Documents";
import Editor from "./pages/Editor";

type Page =
  | { name: "login" }
  | { name: "documents" }
  | { name: "editor"; docId: string };

export default function App() {
  const [page, setPage] = useState<Page>({ name: "login" });
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("userName");
    const userId = localStorage.getItem("userId");
    if (stored && userId) {
      setUserName(stored);
      setPage({ name: "documents" });
    }
  }, []);

  const handleLogin = (name: string) => {
    setUserName(name);
    setPage({ name: "documents" });
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    setUserName("");
    setPage({ name: "login" });
  };

  const handleSelectDoc = (id: string) => {
    setPage({ name: "editor", docId: id });
  };

  if (page.name === "editor") {
    return (
      <Editor
        docId={page.docId}
        userName={userName}
        onBack={() => setPage({ name: "documents" })}
      />
    );
  }

  if (page.name === "documents") {
    return (
      <Documents
        userName={userName}
        onLogout={handleLogout}
        onSelectDoc={handleSelectDoc}
      />
    );
  }

  return <Login onLogin={handleLogin} />;
}
