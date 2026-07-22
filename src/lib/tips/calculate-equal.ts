import { allocateByShares } from "./rounding";
import type { TipAllocationResult } from "./types";

export function calculateEqualAllocation(
  amountPaise: number,
  employeeIds: string[],
): TipAllocationResult[] {
  return allocateByShares(
    amountPaise,
    employeeIds.map((employeeId) => ({ employeeId, share: 1 })),
    "TABLE_SPLIT",
  );
}
