import { assertPaise } from "@/lib/currency";
import { allocateByShares } from "./rounding";
import type { HybridInput, TipAllocationResult } from "./types";

export function calculateHybridAllocation({
  amountPaise,
  directPercentage,
  poolPercentage,
  directRecipients,
  poolRecipients,
}: HybridInput): TipAllocationResult[] {
  assertPaise(amountPaise);

  if (directPercentage + poolPercentage !== 100) {
    throw new Error("Hybrid direct and pool percentages must total 100.");
  }

  if (directPercentage < 0 || poolPercentage < 0) {
    throw new Error("Hybrid percentages cannot be negative.");
  }

  const directPaise = Number(
    (BigInt(amountPaise) * BigInt(directPercentage)) / 100n,
  );
  const poolPaise = amountPaise - directPaise;

  const directAllocations =
    directPaise === 0
      ? []
      : allocateByShares(directPaise, directRecipients, "DIRECT");
  const poolAllocations =
    poolPaise === 0
      ? []
      : allocateByShares(poolPaise, poolRecipients, "POOL");

  const combined = new Map<string, TipAllocationResult>();
  for (const allocation of [...directAllocations, ...poolAllocations]) {
    const existing = combined.get(allocation.employeeId);
    if (!existing) {
      combined.set(allocation.employeeId, allocation);
      continue;
    }

    combined.set(allocation.employeeId, {
      ...existing,
      amountPaise: existing.amountPaise + allocation.amountPaise,
      kind: existing.kind === allocation.kind ? existing.kind : "TABLE_SPLIT",
      share: existing.share + allocation.share,
      totalShares: existing.totalShares + allocation.totalShares,
      remainderPaise: existing.remainderPaise + allocation.remainderPaise,
    });
  }

  const result = [...combined.values()];
  const resultTotal = result.reduce(
    (total, allocation) => total + allocation.amountPaise,
    0,
  );
  if (resultTotal !== amountPaise) {
    throw new Error("Hybrid allocation invariant failed.");
  }

  return result;
}
