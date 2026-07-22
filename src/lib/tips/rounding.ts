import { assertPaise } from "@/lib/currency";
import type { AllocationKind, ShareInput, TipAllocationResult } from "./types";

type ProvisionalAllocation = {
  employeeId: string;
  share: number;
  amountPaise: number;
  fractionalRemainder: bigint;
  index: number;
};

export function allocateByShares(
  amountPaise: number,
  recipients: ShareInput[],
  kind: AllocationKind,
): TipAllocationResult[] {
  assertPaise(amountPaise);

  if (amountPaise < 0) {
    throw new Error("Allocation amount cannot be negative.");
  }

  if (recipients.length === 0) {
    throw new Error("At least one allocation recipient is required.");
  }

  const seen = new Set<string>();
  for (const recipient of recipients) {
    if (seen.has(recipient.employeeId)) {
      throw new Error("Each employee can appear only once in an allocation.");
    }
    if (!Number.isSafeInteger(recipient.share) || recipient.share <= 0) {
      throw new Error("Allocation shares must be positive integers.");
    }
    seen.add(recipient.employeeId);
  }

  const totalShares = recipients.reduce((total, recipient) => {
    return total + recipient.share;
  }, 0);

  if (!Number.isSafeInteger(totalShares)) {
    throw new Error("Total allocation shares exceed the supported range.");
  }

  const totalSharesBigInt = BigInt(totalShares);
  const provisional: ProvisionalAllocation[] = recipients.map(
    (recipient, index) => {
      const numerator = BigInt(amountPaise) * BigInt(recipient.share);
      return {
        employeeId: recipient.employeeId,
        share: recipient.share,
        amountPaise: Number(numerator / totalSharesBigInt),
        fractionalRemainder: numerator % totalSharesBigInt,
        index,
      };
    },
  );

  const allocatedPaise = provisional.reduce(
    (total, allocation) => total + allocation.amountPaise,
    0,
  );
  const remainingPaise = amountPaise - allocatedPaise;

  const remainderOrder = [...provisional].sort((left, right) => {
    if (left.fractionalRemainder === right.fractionalRemainder) {
      return left.index - right.index;
    }
    return left.fractionalRemainder > right.fractionalRemainder ? -1 : 1;
  });

  const awarded = new Set(
    remainderOrder.slice(0, remainingPaise).map((allocation) => allocation.index),
  );

  const results = provisional.map((allocation) => {
    const remainderPaise = awarded.has(allocation.index) ? 1 : 0;
    return {
      employeeId: allocation.employeeId,
      amountPaise: allocation.amountPaise + remainderPaise,
      kind,
      share: allocation.share,
      totalShares,
      remainderPaise,
    };
  });

  const resultTotal = results.reduce(
    (total, allocation) => total + allocation.amountPaise,
    0,
  );

  if (resultTotal !== amountPaise) {
    throw new Error("Allocation invariant failed: allocations do not equal tip.");
  }

  return results;
}
