import { expect, test, beforeAll, afterAll } from "bun:test";
import prisma from "./db";
import { getUserByEmail, listUsers } from "./auth";
import { createApp } from "./app";
import { convertToHtml } from "./routes/upload";

const testUserId = crypto.randomUUID();

beforeAll(async () => {
  await prisma.user.upsert({
    where: { email: "test@test.com" },
    update: {},
    create: {
      id: testUserId,
      name: "Test User",
      email: "test@test.com",
      avatarColor: "#000000",
    },
  });
});

afterAll(async () => {
  await prisma.document.deleteMany({ where: { ownerId: testUserId } });
  await prisma.documentShare.deleteMany({ where: { userId: testUserId } });
  await prisma.user.deleteMany({ where: { email: "test@test.com" } });
  await prisma.$disconnect();
});

test("getUserByEmail returns correct user", async () => {
  const user = await getUserByEmail("test@test.com");
  expect(user).not.toBeNull();
  expect(user!.name).toBe("Test User");
  expect(user!.email).toBe("test@test.com");
});

test("listUsers returns all users", async () => {
  const users = await listUsers();
  expect(users.length).toBeGreaterThan(0);
  expect(users.some((u) => u.email === "test@test.com")).toBe(true);
});

test("create document and verify", async () => {
  const title = "Test Document";
  const content = "<p>Hello world</p>";

  const doc = await prisma.document.create({
    data: { title, content, ownerId: testUserId },
  });

  expect(doc).not.toBeNull();
  expect(doc.title).toBe(title);
  expect(doc.content).toBe(content);
  expect(doc.ownerId).toBe(testUserId);

  await prisma.document.delete({ where: { id: doc.id } });
});

test("share document with another user", async () => {
  const doc = await prisma.document.create({
    data: { title: "Shared Doc", content: "<p>Content</p>", ownerId: testUserId },
  });

  const otherUser = await prisma.user.upsert({
    where: { email: "other@test.com" },
    update: {},
    create: { name: "Other", email: "other@test.com", avatarColor: "#111111" },
  });

  const share = await prisma.documentShare.create({
    data: { documentId: doc.id, userId: otherUser.id, permission: "edit" },
  });

  expect(share).not.toBeNull();
  expect(share.documentId).toBe(doc.id);
  expect(share.userId).toBe(otherUser.id);
  expect(share.permission).toBe("edit");

  await prisma.documentShare.delete({ where: { id: share.id } });
  await prisma.document.delete({ where: { id: doc.id } });
  await prisma.user.delete({ where: { id: otherUser.id } });
});

test("view-only shared user cannot edit document", async () => {
  const app = createApp();

  const owner = await prisma.user.upsert({
    where: { email: "owner@test.com" },
    update: {},
    create: { name: "Owner", email: "owner@test.com", avatarColor: "#111111" },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@test.com" },
    update: {},
    create: { name: "Viewer", email: "viewer@test.com", avatarColor: "#222222" },
  });

  const doc = await prisma.document.create({
    data: { title: "Protected", content: "<p>Initial</p>", ownerId: owner.id },
  });

  const share = await prisma.documentShare.create({
    data: { documentId: doc.id, userId: viewer.id, permission: "view" },
  });

  const response = await app.handle(
    new Request(`http://localhost/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": viewer.id,
      },
      body: JSON.stringify({ content: "<p>Changed</p>" }),
    })
  );

  expect(response.status).toBe(403);

  await prisma.documentShare.delete({ where: { id: share.id } });
  await prisma.document.delete({ where: { id: doc.id } });
  await prisma.user.delete({ where: { id: viewer.id } });
  await prisma.user.delete({ where: { id: owner.id } });
});

test("markdown upload converts a bulleted list without double-wrapping", () => {
  const html = convertToHtml("# Title\n\n- one\n- two\n", ".md");
  expect(html).toBe("<h1>Title</h1><ul><li>one</li><li>two</li></ul>");
});

test("markdown upload converts an ordered list and inline formatting", () => {
  const html = convertToHtml("## Steps\n\n1. **first**\n2. *second*\n", ".md");
  expect(html).toBe(
    "<h2>Steps</h2><ol><li><strong>first</strong></li><li><em>second</em></li></ol>"
  );
});

test("plain text upload wraps paragraphs and escapes html", () => {
  const html = convertToHtml("Hello <b>world</b>\n\nSecond line", ".txt");
  expect(html).toBe("<p>Hello &lt;b&gt;world&lt;/b&gt;</p><p>Second line</p>");
});
