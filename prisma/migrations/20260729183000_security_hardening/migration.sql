-- Scope customer idempotency keys to the bill they belong to.
DROP INDEX IF EXISTS "Tip_idempotencyKey_key";
CREATE UNIQUE INDEX "Tip_billId_idempotencyKey_key"
ON "Tip"("billId", "idempotencyKey");

-- Durable rate limits work across all application instances.
CREATE TABLE "RateLimitBucket" (
    "keyHash" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX "RateLimitBucket_resetAt_idx"
ON "RateLimitBucket"("resetAt");
