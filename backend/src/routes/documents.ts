import { Elysia, t } from "elysia";
import prisma from "../db";

const MAX_TITLE_LENGTH = 120;

export const documentsRoutes = new Elysia({ prefix: "/api/documents" })
  .get("/", async ({ headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const owned = await prisma.document.findMany({
      where: { ownerId: userId },
      include: { owner: { select: { name: true, avatarColor: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const shared = await prisma.documentShare.findMany({
      where: { userId },
      include: {
        document: {
          include: { owner: { select: { name: true, avatarColor: true } } },
        },
      },
      orderBy: { document: { updatedAt: "desc" } },
    });

    const ownedMapped = owned.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      owner_id: d.ownerId,
      owner_name: d.owner.name,
      owner_avatar_color: d.owner.avatarColor,
      created_at: d.createdAt.toISOString(),
      updated_at: d.updatedAt.toISOString(),
    }));

    const sharedMapped = shared.map((s) => ({
      id: s.document.id,
      title: s.document.title,
      content: s.document.content,
      owner_id: s.document.ownerId,
      owner_name: s.document.owner.name,
      owner_avatar_color: s.document.owner.avatarColor,
      created_at: s.document.createdAt.toISOString(),
      updated_at: s.document.updatedAt.toISOString(),
      share_permission: s.permission,
    }));

    return { owned: ownedMapped, shared: sharedMapped };
  })
  .get("/:id", async ({ params: { id }, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { owner: { select: { name: true, avatarColor: true } } },
    });

    if (!doc) return status(404, { error: "Document not found" });

    let permission = "edit";
    if (doc.ownerId !== userId) {
      const share = await prisma.documentShare.findUnique({
        where: { documentId_userId: { documentId: id, userId } },
        select: { permission: true },
      });
      if (!share) return status(403, { error: "Access denied" });
      permission = share.permission;
    }

    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      owner_id: doc.ownerId,
      owner_name: doc.owner.name,
      owner_avatar_color: doc.owner.avatarColor,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString(),
      permission,
    };
  })
  .post("/", async ({ body, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const { title, content } = body;
    const finalTitle = (title || "Untitled").trim() || "Untitled";

    if (finalTitle.length > MAX_TITLE_LENGTH) {
      return status(400, { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` });
    }

    const doc = await prisma.document.create({
      data: {
        title: finalTitle,
        content: content || "",
        ownerId: userId,
      },
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
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      content: t.Optional(t.String()),
    }),
  })
  .patch("/:id", async ({ params: { id }, body, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!doc) return status(404, { error: "Document not found" });

    const canEdit =
      doc.ownerId === userId ||
      !!(await prisma.documentShare.findFirst({
        where: { documentId: id, userId, permission: "edit" },
      }));

    if (!canEdit) return status(403, { error: "Access denied" });

    if (body.title === undefined && body.content === undefined) {
      return status(400, { error: "No fields to update" });
    }

    if (body.title !== undefined) {
      const nextTitle = body.title.trim();
      if (!nextTitle) return status(400, { error: "Title cannot be empty" });
      if (nextTitle.length > MAX_TITLE_LENGTH) {
        return status(400, { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` });
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
      },
      include: { owner: { select: { name: true, avatarColor: true } } },
    });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      owner_id: updated.ownerId,
      owner_name: updated.owner.name,
      owner_avatar_color: updated.owner.avatarColor,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      content: t.Optional(t.String()),
    }),
  })
  .delete("/:id", async ({ params: { id }, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!doc) return status(404, { error: "Document not found" });
    if (doc.ownerId !== userId) return status(403, { error: "Only the owner can delete" });

    await prisma.document.delete({ where: { id } });
    return { success: true };
  });
