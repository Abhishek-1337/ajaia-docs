import { Elysia } from "elysia";
import prisma from "../db";

export const uploadRoutes = new Elysia({ prefix: "/api/upload" })
  .post("/", async ({ request, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return status(400, { error: "No file provided" });
    }

    const allowedExtensions = [".txt", ".md"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return status(400, {
        error: `Unsupported file type. Supported: ${allowedExtensions.join(", ")}`,
      });
    }

    const text = await file.text();
    const title = file.name.replace(/\.[^/.]+$/, "");
    const html = convertToHtml(text, ext);

    const doc = await prisma.document.create({
      data: { title, content: html, ownerId: userId },
      include: { owner: { select: { name: true, avatarColor: true } } },
    });

    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      owner_id: doc.ownerId,
      owner_name: doc.owner.name,
      owner_avatar_color: doc.owner.avatarColor,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString(),
    };
  });

export function convertToHtml(text: string, ext: string): string {
  if (ext === ".md") return simpleMarkdownToHtml(text);

  const escaped = escapeHtml(text);
  return escaped
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function inlineMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function simpleMarkdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${paragraph.join(" ")}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      blocks.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      flushParagraph();
      closeList();
      continue;
    }

    const h3 = line.match(/^### (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h1 = line.match(/^# (.+)$/);
    const bullet = line.match(/^- (.+)$/);
    const ordered = line.match(/^\d+\. (.+)$/);

    if (h1 || h2 || h3) {
      flushParagraph();
      closeList();
      const level = h1 ? 1 : h2 ? 2 : 3;
      const text = (h1 || h2 || h3)![1];
      blocks.push(`<h${level}>${inlineMarkdown(text)}</h${level}>`);
    } else if (bullet) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        blocks.push("<ul>");
        listType = "ul";
      }
      blocks.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
    } else if (ordered) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        blocks.push("<ol>");
        listType = "ol";
      }
      blocks.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
    } else {
      closeList();
      paragraph.push(inlineMarkdown(line));
    }
  }
  flushParagraph();
  closeList();

  return blocks.join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
