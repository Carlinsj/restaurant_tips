import { assertPaise } from "@/lib/currency";
import type { TipAllocationResult } from "./types";

export function calculateDirectAllocation(
  amountPaise: number,
  employeeId: string,
): TipAllocationResult[] {
  assertPaise(amountPaise);

  if (amountPaise < 0) {
    throw new Error("Tip amount cannot be negative.");
  }

  if (!employeeId) {
    throw new Error("A primary employee is required for direct allocation.");
  }

  return [
    {
      employeeId,
      amountPaise,
      kind: "DIRECT",
      share: 1,
      totalShares: 1,
      remainderPaise: 0,
    },
  ];
}
