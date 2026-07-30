import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function configuredDatabaseUrl(): string | undefined {
  const configured = process.env.DATABASE_URL;
  if (!configured || process.env.NODE_ENV === "production") return configured;

  try {
    const url = new URL(configured);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      return configured;
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "2");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "2");
    }
    return url.toString();
  } catch {
    return configured;
  }
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasourceUrl: configuredDatabaseUrl(),
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalForPrisma.prisma;
}
