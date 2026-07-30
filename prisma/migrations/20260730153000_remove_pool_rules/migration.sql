BEGIN;

UPDATE "TipRule"
SET
  "strategy" = 'WEIGHTED',
  "isDefault" = false,
  "isActive" = false,
  "configuration" = "configuration" || '{"disabledReason":"POOLING_REMOVED"}'::jsonb
WHERE "strategy" IN ('HOURS_POOL', 'POINTS_POOL', 'HYBRID');

ALTER TYPE "DistributionStrategy" RENAME TO "DistributionStrategy_old";

CREATE TYPE "DistributionStrategy" AS ENUM ('DIRECT', 'WEIGHTED', 'EQUAL');

ALTER TABLE "TipRule"
ALTER COLUMN "strategy" TYPE "DistributionStrategy"
USING ("strategy"::text::"DistributionStrategy");

DROP TYPE "DistributionStrategy_old";

ALTER TABLE "TipRule" DROP COLUMN "poolPercentage";

COMMIT;
