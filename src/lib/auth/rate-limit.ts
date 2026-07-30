import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/database/prisma";

type RateLimitInput = {
  key: string;
  maxAttempts: number;
  windowMs: number;
};

type RateLimitRow = {
  attempts: number;
  resetAt: Date;
};

function rateLimitSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function hashRateLimitKey(key: string): string {
  return createHmac("sha256", rateLimitSecret()).update(key).digest("hex");
}

export async function checkRateLimit({
  key,
  maxAttempts,
  windowMs,
}: RateLimitInput): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
}> {
  const keyHash = hashRateLimitKey(key);
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await getPrisma().$queryRaw<RateLimitRow[]>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("keyHash", "attempts", "resetAt", "updatedAt")
    VALUES (${keyHash}, 1, ${resetAt}, NOW())
    ON CONFLICT ("keyHash") DO UPDATE SET
      "attempts" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."attempts" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN EXCLUDED."resetAt"
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "attempts", "resetAt"
  `);
  const row = rows[0];
  if (!row) throw new Error("Unable to update the rate limit.");
  if (keyHash.startsWith("00")) {
    await getPrisma().$executeRaw(
      Prisma.sql`DELETE FROM "RateLimitBucket" WHERE "resetAt" < NOW() - INTERVAL '1 day'`,
    );
  }
  return {
    allowed: row.attempts <= maxAttempts,
    retryAfterSeconds:
      row.attempts <= maxAttempts
        ? 0
        : Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
  };
}

export async function clearRateLimit(key: string): Promise<void> {
  const keyHash = hashRateLimitKey(key);
  await getPrisma().$executeRaw(
    Prisma.sql`DELETE FROM "RateLimitBucket" WHERE "keyHash" = ${keyHash}`,
  );
}
