import { describe, expect, it } from "vitest";
import {
  calculateDirectAllocation,
  calculateEqualAllocation,
  calculateTableLoadAllocation,
  calculateWeightedAllocation,
  createRefundReversals,
} from "@/lib/tips";
import {
  calculatePercentageTip,
  currencyMinorUnitDigits,
  formatCurrency,
  parseCurrencyToMinor,
  parseRupeesToPaise,
} from "@/lib/currency";

function total(allocations: { amountPaise: number }[]): number {
  return allocations.reduce((sum, allocation) => sum + allocation.amountPaise, 0);
}

function assignmentsForWorkloads(
  workloads: number[],
): { employeeId: string; tableId: string }[] {
  return workloads.flatMap((workload, employeeIndex) =>
    Array.from({ length: workload }, (_, tableIndex) => ({
      employeeId: `employee-${employeeIndex}`,
      tableId:
        tableIndex === 0
          ? "tipped-table"
          : `employee-${employeeIndex}-table-${tableIndex}`,
    })),
  );
}

function workloadCombinations(
  recipientCount: number,
  maximumWorkload: number,
): number[][] {
  if (recipientCount === 0) return [[]];
  return Array.from({ length: maximumWorkload }, (_, index) => index + 1)
    .flatMap((workload) =>
      workloadCombinations(recipientCount - 1, maximumWorkload).map(
        (remaining) => [workload, ...remaining],
      ),
    );
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (remaining) => [item, ...remaining],
    ),
  );
}

describe("currency calculations", () => {
  it("parses fixed rupee amounts without floating-point arithmetic", () => {
    expect(parseRupeesToPaise("200.50")).toBe(20_050);
    expect(parseRupeesToPaise("1,234.5")).toBe(123_450);
  });

  it("calculates a percentage tip in paise", () => {
    expect(calculatePercentageTip(200_000, 10)).toBe(20_000);
    expect(calculatePercentageTip(10_005, 5)).toBe(500);
  });

  it("handles zero-, two-, and three-decimal currencies exactly", () => {
    expect(currencyMinorUnitDigits("JPY")).toBe(0);
    expect(currencyMinorUnitDigits("USD")).toBe(2);
    expect(currencyMinorUnitDigits("KWD")).toBe(3);
    expect(parseCurrencyToMinor("2450", "JPY")).toBe(2450);
    expect(parseCurrencyToMinor("20.125", "KWD")).toBe(20_125);
    expect(formatCurrency(20_125, "KWD", "en")).toContain("20.125");
  });
});

describe("tip allocation strategies", () => {
  it("allocates a direct tip", () => {
    expect(calculateDirectAllocation(20_000, "arjun")[0]).toMatchObject({
      employeeId: "arjun",
      amountPaise: 20_000,
    });
  });

  it("allocates a weighted 70/30 tip", () => {
    const allocations = calculateWeightedAllocation(
      20_000,
      [
        { employeeId: "arjun", share: 70 },
        { employeeId: "priya", share: 30 },
      ],
      true,
    );
    expect(allocations.map(({ amountPaise }) => amountPaise)).toEqual([
      14_000, 6_000,
    ]);
  });

  it("gives a person covering one table four times the share of someone covering four", () => {
    const allocations = calculateTableLoadAllocation(10_000, "table-1", [
      { employeeId: "focused", tableId: "table-1" },
      { employeeId: "busy", tableId: "table-1" },
      { employeeId: "busy", tableId: "table-2" },
      { employeeId: "busy", tableId: "table-3" },
      { employeeId: "busy", tableId: "table-4" },
    ]);

    expect(allocations).toMatchObject([
      {
        employeeId: "busy",
        amountPaise: 2_000,
        activeTableCount: 4,
        shareBasisPoints: 2_000,
      },
      {
        employeeId: "focused",
        amountPaise: 8_000,
        activeTableCount: 1,
        shareBasisPoints: 8_000,
      },
    ]);
  });

  it("balances three workloads and preserves every paise", () => {
    const allocations = calculateTableLoadAllocation(10_001, "table-1", [
      { employeeId: "one-table", tableId: "table-1" },
      { employeeId: "two-tables", tableId: "table-1" },
      { employeeId: "two-tables", tableId: "table-2" },
      { employeeId: "four-tables", tableId: "table-1" },
      { employeeId: "four-tables", tableId: "table-2" },
      { employeeId: "four-tables", tableId: "table-3" },
      { employeeId: "four-tables", tableId: "table-4" },
    ]);

    expect(
      Object.fromEntries(
        allocations.map((allocation) => [
          allocation.employeeId,
          allocation.amountPaise,
        ]),
      ),
    ).toEqual({
      "four-tables": 1_429,
      "one-table": 5_715,
      "two-tables": 2_857,
    });
    expect(total(allocations)).toBe(10_001);
    expect(
      allocations.reduce(
        (sum, allocation) => sum + allocation.shareBasisPoints,
        0,
      ),
    ).toBe(10_000);
  });

  it("splits the demo table 60/40 from two versus three active tables", () => {
    const allocations = calculateTableLoadAllocation(30_000, "table-6", [
      { employeeId: "arjun", tableId: "table-3" },
      { employeeId: "arjun", tableId: "table-6" },
      { employeeId: "priya", tableId: "table-2" },
      { employeeId: "priya", tableId: "table-3" },
      { employeeId: "priya", tableId: "table-6" },
    ]);

    expect(allocations.map(({ amountPaise }) => amountPaise)).toEqual([
      18_000, 12_000,
    ]);
  });

  it("excludes staff who are not assigned to the tipped table", () => {
    const allocations = calculateTableLoadAllocation(1_000, "table-1", [
      { employeeId: "eligible", tableId: "table-1" },
      { employeeId: "eligible", tableId: "table-2" },
      { employeeId: "other", tableId: "table-2" },
    ]);

    expect(allocations).toMatchObject([
      {
        employeeId: "eligible",
        amountPaise: 1_000,
        shareBasisPoints: 10_000,
      },
    ]);
  });

  it("deduplicates table assignments and resolves equal remainders by employee ID", () => {
    const allocations = calculateTableLoadAllocation(1, "table-1", [
      { employeeId: "z", tableId: "table-1" },
      { employeeId: "a", tableId: "table-1" },
      { employeeId: "a", tableId: "table-1" },
    ]);

    expect(allocations.map(({ employeeId, amountPaise }) => ({
      employeeId,
      amountPaise,
    }))).toEqual([
      { employeeId: "a", amountPaise: 1 },
      { employeeId: "z", amountPaise: 0 },
    ]);
  });

  it("uses the allocation key to distribute exact-tie remainder units without changing retries", () => {
    const assignments = [
      { employeeId: "a", tableId: "table-1" },
      { employeeId: "b", tableId: "table-1" },
      { employeeId: "c", tableId: "table-1" },
    ];
    const winners = new Set<string>();

    for (let index = 0; index < 100; index += 1) {
      const allocations = calculateTableLoadAllocation(
        1,
        "table-1",
        assignments,
        { allocationKey: `tip-${index}` },
      );
      const winner = allocations.find(
        (allocation) => allocation.amountPaise === 1,
      );
      expect(winner?.remainderTieBreaker).toBe("HASHED_ALLOCATION_KEY");
      expect(winner?.remainderSeed).toMatch(/^[a-f0-9]{16}$/);
      if (winner) winners.add(winner.employeeId);
    }

    expect(winners).toEqual(new Set(["a", "b", "c"]));
    expect(
      calculateTableLoadAllocation(1, "table-1", assignments, {
        allocationKey: "retry-safe-tip",
      }),
    ).toEqual(
      calculateTableLoadAllocation(1, "table-1", [...assignments].reverse(), {
        allocationKey: "retry-safe-tip",
      }),
    );
  });

  it("preserves invariants across workload combinations and minor-unit amounts", () => {
    const amounts = [0, 1, 2, 7, 10_001, Number.MAX_SAFE_INTEGER];

    for (let recipientCount = 1; recipientCount <= 4; recipientCount += 1) {
      for (const workloads of workloadCombinations(recipientCount, 4)) {
        const assignments = assignmentsForWorkloads(workloads);
        for (const amountPaise of amounts) {
          const allocations = calculateTableLoadAllocation(
            amountPaise,
            "tipped-table",
            assignments,
            { allocationKey: `combination:${workloads.join(",")}:${amountPaise}` },
          );

          expect(allocations).toHaveLength(recipientCount);
          expect(total(allocations)).toBe(amountPaise);
          expect(
            allocations.reduce(
              (sum, allocation) => sum + allocation.shareBasisPoints,
              0,
            ),
          ).toBe(10_000);
          expect(new Set(allocations.map(({ employeeId }) => employeeId)).size)
            .toBe(recipientCount);

          for (let left = 0; left < recipientCount; left += 1) {
            for (let right = left + 1; right < recipientCount; right += 1) {
              const leftAllocation = allocations.find(
                ({ employeeId }) => employeeId === `employee-${left}`,
              );
              const rightAllocation = allocations.find(
                ({ employeeId }) => employeeId === `employee-${right}`,
              );
              expect(leftAllocation).toBeDefined();
              expect(rightAllocation).toBeDefined();
              if (!leftAllocation || !rightAllocation) continue;

              if (workloads[left] < workloads[right]) {
                expect(leftAllocation.shareBasisPoints).toBeGreaterThanOrEqual(
                  rightAllocation.shareBasisPoints,
                );
              } else if (workloads[left] > workloads[right]) {
                expect(leftAllocation.shareBasisPoints).toBeLessThanOrEqual(
                  rightAllocation.shareBasisPoints,
                );
              } else {
                expect(
                  Math.abs(
                    leftAllocation.shareBasisPoints -
                      rightAllocation.shareBasisPoints,
                  ),
                ).toBeLessThanOrEqual(1);
                expect(
                  Math.abs(
                    leftAllocation.amountPaise - rightAllocation.amountPaise,
                  ),
                ).toBeLessThanOrEqual(1);
              }
            }
          }
        }
      }
    }
  });

  it("is invariant across every input permutation for a three-person workload", () => {
    const assignments = assignmentsForWorkloads([1, 2, 3]);
    const expected = calculateTableLoadAllocation(
      10_001,
      "tipped-table",
      assignments,
      { allocationKey: "permutation-test" },
    );

    for (const permutation of permutations(assignments)) {
      expect(
        calculateTableLoadAllocation(
          10_001,
          "tipped-table",
          permutation,
          { allocationKey: "permutation-test" },
        ),
      ).toEqual(expected);
    }
  });

  it("handles hundreds of recipients and thousands of assignments exactly", () => {
    const workloads = Array.from(
      { length: 500 },
      (_, index) => (index % 20) + 1,
    );
    const allocations = calculateTableLoadAllocation(
      10_000_000,
      "tipped-table",
      assignmentsForWorkloads(workloads),
      { allocationKey: "large-shift" },
    );

    expect(allocations).toHaveLength(500);
    expect(total(allocations)).toBe(10_000_000);
    expect(
      allocations.reduce(
        (sum, allocation) => sum + allocation.shareBasisPoints,
        0,
      ),
    ).toBe(10_000);
  });

  it("rejects workload allocation when the tipped table has no assigned staff", () => {
    expect(() =>
      calculateTableLoadAllocation(100, "table-1", [
        { employeeId: "arjun", tableId: "table-2" },
      ]),
    ).toThrow("must be assigned");
  });

  it("rejects invalid workload allocation inputs", () => {
    const assignment = [{ employeeId: "a", tableId: "table-1" }];

    expect(() =>
      calculateTableLoadAllocation(-1, "table-1", assignment),
    ).toThrow("cannot be negative");
    expect(() =>
      calculateTableLoadAllocation(
        Number.MAX_SAFE_INTEGER + 1,
        "table-1",
        assignment,
      ),
    ).toThrow("safe integer");
    expect(() =>
      calculateTableLoadAllocation(1, " ", assignment),
    ).toThrow("tipped table");
    expect(() =>
      calculateTableLoadAllocation(1, "table-1", [
        { employeeId: " ", tableId: "table-1" },
      ]),
    ).toThrow("employee and table IDs");
    expect(() =>
      calculateTableLoadAllocation(1, "table-1", assignment, {
        allocationKey: " ",
      }),
    ).toThrow("allocation key");
  });

  it("assigns remaining paise deterministically for equal splits", () => {
    const allocations = calculateEqualAllocation(100, ["a", "b", "c"]);
    expect(allocations.map(({ amountPaise }) => amountPaise)).toEqual([34, 33, 33]);
    expect(total(allocations)).toBe(100);
  });

  it("creates exact negative reversals for refunds", () => {
    const original = calculateWeightedAllocation(20_000, [
      { employeeId: "arjun", share: 70 },
      { employeeId: "priya", share: 30 },
    ]);
    expect(total(createRefundReversals(original))).toBe(-20_000);
  });

  it("rejects percentage weights that do not total 100", () => {
    expect(() =>
      calculateWeightedAllocation(
        100,
        [{ employeeId: "arjun", share: 70 }],
        true,
      ),
    ).toThrow("must total 100");
  });
});
