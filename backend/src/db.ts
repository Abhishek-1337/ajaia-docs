import { PrismaClient } from "@prisma/client";

const DATABASE_URL =
  Bun.env.DATABASE_URL || "postgres://localhost:5432/ajaia_docs";

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

export default prisma;
