import { allocateByShares } from "./rounding";
import type { ShareInput, TipAllocationResult } from "./types";

export function calculateWeightedAllocation(
  amountPaise: number,
  recipients: ShareInput[],
  requireOneHundredPercent = false,
): TipAllocationResult[] {
  if (requireOneHundredPercent) {
    const totalWeight = recipients.reduce(
      (total, recipient) => total + recipient.share,
      0,
    );
    if (totalWeight !== 100) {
      throw new Error("Weighted allocation percentages must total 100.");
    }
  }

  return allocateByShares(amountPaise, recipients, "TABLE_SPLIT");
}
