import { assertPaise } from "@/lib/currency";
import type {
  ActiveTableAssignment,
  TableLoadAllocationOptions,
  TableLoadAllocationResult,
} from "./types";

const SHARE_BASIS_POINTS = 10_000;
const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;
const UTF8_ENCODER = new TextEncoder();

type WeightedRecipient = {
  employeeId: string;
  activeTableCount: number;
  inverseLoadWeight: bigint;
  remainderPriority: bigint | null;
};

type ApportionedAmount = {
  employeeId: string;
  amount: number;
  remainderUnit: number;
};

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left;
  let b = right;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function leastCommonMultiple(left: bigint, right: bigint): bigint {
  return (left / greatestCommonDivisor(left, right)) * right;
}

function stableHash64(value: string): bigint {
  let hash = FNV_OFFSET_BASIS_64;
  for (const byte of UTF8_ENCODER.encode(value)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME_64) & UINT64_MASK;
  }
  return hash;
}

function remainderSeedFor(allocationKey: string | undefined): string | null {
  if (allocationKey === undefined) return null;
  if (!allocationKey.trim()) {
    throw new Error("The allocation key cannot be empty.");
  }
  return stableHash64(`tipsathi:table-load:v2:${allocationKey}`)
    .toString(16)
    .padStart(16, "0");
}

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
      remainderPriority: recipient.remainderPriority,
    };
  });
  const allocated = provisional.reduce(
    (sum, allocation) => sum + allocation.amount,
    0,
  );
  const remainderOrder = [...provisional].sort((left, right) => {
    if (left.fractionalRemainder === right.fractionalRemainder) {
      if (
        left.remainderPriority !== null &&
        right.remainderPriority !== null &&
        left.remainderPriority !== right.remainderPriority
      ) {
        return left.remainderPriority < right.remainderPriority ? -1 : 1;
      }
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
  options: TableLoadAllocationOptions = {},
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

  // The least common multiple creates exact integer equivalents of
  // 1/tableCount while growing no larger than necessary.
  const commonDenominator = tableCounts.reduce(
    (multiple, recipient) =>
      leastCommonMultiple(multiple, BigInt(recipient.activeTableCount)),
    1n,
  );
  const remainderSeed = remainderSeedFor(options.allocationKey);
  const weightedRecipients: WeightedRecipient[] = tableCounts.map(
    (recipient) => ({
      ...recipient,
      inverseLoadWeight:
        commonDenominator / BigInt(recipient.activeTableCount),
      remainderPriority:
        remainderSeed === null
          ? null
          : stableHash64(`${remainderSeed}:${recipient.employeeId}`),
    }),
  );
  const amounts = apportionExactly(amountPaise, weightedRecipients);
  const shares = apportionExactly(SHARE_BASIS_POINTS, weightedRecipients);
  const sharesByEmployee = new Map(
    shares.map((share) => [share.employeeId, share.amount]),
  );
  const recipientsByEmployee = new Map(
    weightedRecipients.map((recipient) => [recipient.employeeId, recipient]),
  );

  const results: TableLoadAllocationResult[] = amounts.map((allocation) => {
    const recipient = recipientsByEmployee.get(allocation.employeeId);
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
      remainderTieBreaker:
        remainderSeed === null ? "EMPLOYEE_ID" : "HASHED_ALLOCATION_KEY",
      remainderSeed,
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
