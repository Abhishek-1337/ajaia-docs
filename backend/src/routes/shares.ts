import { Elysia, t } from "elysia";
import prisma from "../db";

const ALLOWED_PERMISSIONS = ["view", "edit"] as const;

function isAllowedPermission(value: string): value is (typeof ALLOWED_PERMISSIONS)[number] {
  return (ALLOWED_PERMISSIONS as readonly string[]).includes(value);
}

export const sharesRoutes = new Elysia({ prefix: "/api/shares" })
  .get("/:documentId", async ({ params: { documentId }, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!doc) return status(404, { error: "Document not found" });
    if (doc.ownerId !== userId) return status(403, { error: "Only owner can view shares" });

    const shares = await prisma.documentShare.findMany({
      where: { documentId },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
      orderBy: { createdAt: "desc" },
    });

    return shares.map((s) => ({
      id: s.id,
      document_id: s.documentId,
      user_id: s.user.id,
      user_name: s.user.name,
      user_email: s.user.email,
      user_avatar_color: s.user.avatarColor,
      permission: s.permission,
      created_at: s.createdAt.toISOString(),
    }));
  })
  .post("/", async ({ body, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const { document_id, user_email, permission } = body;
    const normalizedPermission = (permission || "edit").toLowerCase();

    if (!isAllowedPermission(normalizedPermission)) {
      return status(400, { error: "Permission must be either 'view' or 'edit'" });
    }

    const doc = await prisma.document.findUnique({
      where: { id: document_id },
      select: { ownerId: true },
    });

    if (!doc) return status(404, { error: "Document not found" });
    if (doc.ownerId !== userId) return status(403, { error: "Only owner can share" });

    const targetUser = await prisma.user.findUnique({
      where: { email: user_email },
      select: { id: true },
    });

    if (!targetUser) return status(404, { error: "User not found" });
    if (targetUser.id === userId) return status(400, { error: "Cannot share with yourself" });

    const share = await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: document_id, userId: targetUser.id } },
      create: {
        documentId: document_id,
        userId: targetUser.id,
        permission: normalizedPermission,
      },
      update: { permission: normalizedPermission },
    });

    return { success: true, share_id: share.id };
  }, {
    body: t.Object({
      document_id: t.String(),
      user_email: t.String(),
      permission: t.Optional(t.Union([t.Literal("view"), t.Literal("edit")])),
    }),
  })
  .delete("/:shareId", async ({ params: { shareId }, headers, status }) => {
    const userId = headers["x-user-id"];
    if (!userId) return status(401, { error: "Missing x-user-id header" });

    const share = await prisma.documentShare.findUnique({
      where: { id: shareId },
      include: { document: { select: { ownerId: true } } },
    });

    if (!share) return status(404, { error: "Share not found" });
    if (share.document.ownerId !== userId) return status(403, { error: "Only owner can remove shares" });

    await prisma.documentShare.delete({ where: { id: shareId } });
    return { success: true };
  });
