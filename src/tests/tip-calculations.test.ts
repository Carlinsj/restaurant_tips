import { describe, expect, it } from "vitest";
import {
  calculateDirectAllocation,
  calculateEqualAllocation,
  calculateHoursPool,
  calculateHybridAllocation,
  calculatePointsPool,
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

  it("rejects workload allocation when the tipped table has no assigned staff", () => {
    expect(() =>
      calculateTableLoadAllocation(100, "table-1", [
        { employeeId: "arjun", tableId: "table-2" },
      ]),
    ).toThrow("must be assigned");
  });

  it("assigns remaining paise deterministically for equal splits", () => {
    const allocations = calculateEqualAllocation(100, ["a", "b", "c"]);
    expect(allocations.map(({ amountPaise }) => amountPaise)).toEqual([34, 33, 33]);
    expect(total(allocations)).toBe(100);
  });

  it("allocates pooled tips by minutes worked", () => {
    const allocations = calculateHoursPool(1_000, [
      { employeeId: "a", share: 360 },
      { employeeId: "b", share: 240 },
    ]);
    expect(allocations.map(({ amountPaise }) => amountPaise)).toEqual([600, 400]);
  });

  it("allocates pooled tips by role points", () => {
    const allocations = calculatePointsPool(1_800, [
      { employeeId: "captain", share: 12 },
      { employeeId: "runner", share: 6 },
    ]);
    expect(allocations.map(({ amountPaise }) => amountPaise)).toEqual([
      1_200, 600,
    ]);
  });

  it("combines direct and pool portions in a hybrid allocation", () => {
    const allocations = calculateHybridAllocation({
      amountPaise: 10_001,
      directPercentage: 80,
      poolPercentage: 20,
      directRecipients: [{ employeeId: "waiter", share: 1 }],
      poolRecipients: [
        { employeeId: "waiter", share: 1 },
        { employeeId: "runner", share: 1 },
      ],
    });
    expect(total(allocations)).toBe(10_001);
    expect(allocations.find(({ employeeId }) => employeeId === "waiter")?.amountPaise).toBe(9_001);
    expect(allocations.find(({ employeeId }) => employeeId === "runner")?.amountPaise).toBe(1_000);
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
