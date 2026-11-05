import { PrismaClient } from "@prisma/client";

/**
 * Global singleton pattern for PrismaClient in Next.js development environment.
 * Prevents connection exhaustion caused by fast refresh / hot reloading.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
export * from "@prisma/client";
