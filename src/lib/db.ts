import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Auto-configure SQLite WAL mode for high concurrency
if (
  process.env.DATABASE_URL?.includes(".db") ||
  process.env.DATABASE_URL?.startsWith("file:")
) {
  prisma
    .$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL;"))
    .then(() => prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;"))
    .catch((err) => console.error("Error configuring SQLite PRAGMAs:", err));
}

export default prisma;
