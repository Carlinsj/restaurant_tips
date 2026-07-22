import { describe, expect, it } from "vitest";
import {
  calculateDirectAllocation,
  calculateEqualAllocation,
  calculateHoursPool,
  calculateHybridAllocation,
  calculatePointsPool,
  calculateWeightedAllocation,
  createRefundReversals,
} from "@/lib/tips";
import {
  calculatePercentageTip,
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
