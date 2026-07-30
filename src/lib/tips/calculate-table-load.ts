import { assertPaise } from "@/lib/currency";
import type {
  ActiveTableAssignment,
  TableLoadAllocationResult,
} from "./types";

const SHARE_BASIS_POINTS = 10_000;

type WeightedRecipient = {
  employeeId: string;
  activeTableCount: number;
  inverseLoadWeight: bigint;
};

type ApportionedAmount = {
  employeeId: string;
  amount: number;
  remainderUnit: number;
};

function apportionExactly(
  total: number,
  recipients: WeightedRecipient[],
): ApportionedAmount[] {
  const totalWeight = recipients.reduce(
    (sum, recipient) => sum + recipient.inverseLoadWeight,
    0n,
  );
  const provisional = recipients.map((recipient) => {
    const numerator = BigInt(total) * recipient.inverseLoadWeight;
    return {
      employeeId: recipient.employeeId,
      amount: Number(numerator / totalWeight),
      fractionalRemainder: numerator % totalWeight,
    };
  });
  const allocated = provisional.reduce(
    (sum, allocation) => sum + allocation.amount,
    0,
  );
  const remainderOrder = [...provisional].sort((left, right) => {
    if (left.fractionalRemainder === right.fractionalRemainder) {
      return left.employeeId.localeCompare(right.employeeId);
    }
    return left.fractionalRemainder > right.fractionalRemainder ? -1 : 1;
  });
  const awarded = new Set(
    remainderOrder
      .slice(0, total - allocated)
      .map((allocation) => allocation.employeeId),
  );

  return provisional.map((allocation) => ({
    employeeId: allocation.employeeId,
    amount: allocation.amount + (awarded.has(allocation.employeeId) ? 1 : 0),
    remainderUnit: awarded.has(allocation.employeeId) ? 1 : 0,
  }));
}

/**
 * Splits a table tip by inverse active-table load.
 *
 * A person assigned to N active tables receives a raw weight of 1/N. Only
 * people assigned to the tipped table are eligible, while their load counts
 * every distinct active table assignment in the same open shift.
 */
export function calculateTableLoadAllocation(
  amountPaise: number,
  tippedTableId: string,
  activeAssignments: ActiveTableAssignment[],
): TableLoadAllocationResult[] {
  assertPaise(amountPaise);
  if (amountPaise < 0) {
    throw new Error("Allocation amount cannot be negative.");
  }
  if (!tippedTableId.trim()) {
    throw new Error("A tipped table is required.");
  }

  const tablesByEmployee = new Map<string, Set<string>>();
  for (const assignment of activeAssignments) {
    if (!assignment.employeeId.trim() || !assignment.tableId.trim()) {
      throw new Error("Active table assignments require employee and table IDs.");
    }
    const tables =
      tablesByEmployee.get(assignment.employeeId) ?? new Set<string>();
    tables.add(assignment.tableId);
    tablesByEmployee.set(assignment.employeeId, tables);
  }

  const eligibleEmployeeIds = [...tablesByEmployee.entries()]
    .filter(([, tableIds]) => tableIds.has(tippedTableId))
    .map(([employeeId]) => employeeId)
    .sort((left, right) => left.localeCompare(right));
  if (eligibleEmployeeIds.length === 0) {
    throw new Error("At least one employee must be assigned to the tipped table.");
  }

  const tableCounts = eligibleEmployeeIds.map((employeeId) => {
    const count = tablesByEmployee.get(employeeId)?.size ?? 0;
    if (!Number.isSafeInteger(count) || count <= 0) {
      throw new Error("Active table counts must be positive integers.");
    }
    return { employeeId, activeTableCount: count };
  });

  // The product creates integer equivalents of 1/tableCount without using
  // floating-point arithmetic: product/count is proportional to 1/count.
  const commonProduct = tableCounts.reduce(
    (product, recipient) => product * BigInt(recipient.activeTableCount),
    1n,
  );
  const weightedRecipients: WeightedRecipient[] = tableCounts.map(
    (recipient) => ({
      ...recipient,
      inverseLoadWeight:
        commonProduct / BigInt(recipient.activeTableCount),
    }),
  );
  const amounts = apportionExactly(amountPaise, weightedRecipients);
  const shares = apportionExactly(SHARE_BASIS_POINTS, weightedRecipients);
  const sharesByEmployee = new Map(
    shares.map((share) => [share.employeeId, share.amount]),
  );

  const results = amounts.map((allocation) => {
    const recipient = weightedRecipients.find(
      (item) => item.employeeId === allocation.employeeId,
    );
    if (!recipient) {
      throw new Error("Allocation invariant failed: recipient is missing.");
    }
    return {
      employeeId: allocation.employeeId,
      amountPaise: allocation.amount,
      kind: "TABLE_SPLIT" as const,
      activeTableCount: recipient.activeTableCount,
      shareBasisPoints: sharesByEmployee.get(allocation.employeeId) ?? 0,
      totalShareBasisPoints: SHARE_BASIS_POINTS as 10_000,
      remainderPaise: allocation.remainderUnit,
    };
  });

  if (
    results.reduce((sum, allocation) => sum + allocation.amountPaise, 0) !==
      amountPaise ||
    results.reduce((sum, allocation) => sum + allocation.shareBasisPoints, 0) !==
      SHARE_BASIS_POINTS
  ) {
    throw new Error("Allocation invariant failed: workload split does not balance.");
  }

  return results;
}
