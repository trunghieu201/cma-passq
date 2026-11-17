import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string {
  // Check if running in a Serverless environment (Vercel, AWS Lambda)
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const tmpDbPath = path.join("/tmp", "dev.db");

    // Check if the writable DB already exists in /tmp
    const existsInTmp = fs.existsSync(tmpDbPath);
    const tmpSize = existsInTmp ? fs.statSync(tmpDbPath).size : 0;

    if (!existsInTmp || tmpSize < 1000) {
      // Find source database in possible bundled locations
      const possibleSources = [
        path.join(process.cwd(), "prisma", "dev.db"),
        path.join(process.cwd(), "dev.db"),
        path.resolve("./prisma/dev.db"),
        path.resolve("./dev.db"),
      ];

      let copied = false;
      for (const src of possibleSources) {
        if (fs.existsSync(src)) {
          const srcSize = fs.statSync(src).size;
          if (srcSize > 1000) {
            try {
              fs.copyFileSync(src, tmpDbPath);
              copied = true;
              console.log(`[DB] Copied SQLite database from ${src} (${srcSize} bytes) to ${tmpDbPath}`);
              break;
            } catch (err) {
              console.error(`[DB] Error copying from ${src} to ${tmpDbPath}:`, err);
            }
          }
        }
      }

      if (!copied) {
        console.warn("[DB] Warning: Could not find pre-populated SQLite file in bundle to copy to /tmp.");
      }
    }

    return `file:${tmpDbPath}`;
  }

  // Local or standard container environment
  return process.env.DATABASE_URL || "file:./dev.db";
}

const activeDbUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: activeDbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// PRAGMA configuration (safe)
if (activeDbUrl.includes(".db") || activeDbUrl.startsWith("file:")) {
  // Only set WAL if not on Windows network or if in /tmp
  prisma
    .$executeRawUnsafe("PRAGMA foreign_keys = ON;")
    .catch((err) => console.error("Error setting PRAGMA foreign_keys:", err));
}

export default prisma;
