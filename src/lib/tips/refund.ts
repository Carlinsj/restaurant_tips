import type { TipAllocationResult } from "./types";

export function createRefundReversals(
  allocations: TipAllocationResult[],
): TipAllocationResult[] {
  return allocations.map((allocation) => ({
    ...allocation,
    amountPaise: -allocation.amountPaise,
    kind: "REVERSAL",
  }));
}
