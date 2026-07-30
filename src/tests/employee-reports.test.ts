import { describe, expect, it } from "vitest";
import {
  buildPersonalShiftReports,
  summarizeShiftReports,
  type EmployeeAllocationRecord,
} from "@/lib/employee-reports";

const baseAllocation: EmployeeAllocationRecord = {
  id: "allocation-1",
  shiftId: "shift-1",
  shiftName: "Dinner service",
  shiftDate: "2026-07-22",
  shiftStatus: "CLOSED",
  tipId: "tip-1",
  amountPaise: 10_000,
  allocationType: "DIRECT",
  createdAt: "2026-07-22T20:00:00.000Z",
  tableNumber: 6,
  method: "DIGITAL",
};

describe("employee personal reports", () => {
  it("reports all tip shares as direct while preserving legacy earnings", () => {
    const reports = buildPersonalShiftReports({
      allocations: [
        baseAllocation,
        {
          ...baseAllocation,
          id: "allocation-2",
          tipId: "tip-2",
          allocationType: "POOL",
          amountPaise: 4_000,
        },
        {
          ...baseAllocation,
          id: "allocation-3",
          tipId: "tip-3",
          allocationType: "ADJUSTMENT",
          amountPaise: 500,
        },
        {
          ...baseAllocation,
          id: "allocation-4",
          tipId: "tip-1",
          allocationType: "REVERSAL",
          amountPaise: -1_000,
        },
      ],
      attendance: [
        {
          shiftId: "shift-1",
          shiftName: "Dinner service",
          shiftDate: "2026-07-22",
          shiftStatus: "CLOSED",
          minutesWorked: 360,
          clockInAt: "2026-07-22T16:00:00.000Z",
          clockOutAt: "2026-07-22T22:00:00.000Z",
        },
      ],
      payouts: [
        {
          shiftId: "shift-1",
          amountPaise: 13_500,
          status: "APPROVED",
        },
      ],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      directPaise: 14_000,
      adjustmentsPaise: -500,
      totalPaise: 13_500,
      tipCount: 3,
      minutesWorked: 360,
      payoutStatus: "Approved",
    });
  });

  it("includes attended shifts with no tips and summarizes recent earnings", () => {
    const reports = buildPersonalShiftReports({
      allocations: [baseAllocation],
      attendance: [
        {
          shiftId: "shift-1",
          shiftName: "Dinner service",
          shiftDate: "2026-07-22",
          shiftStatus: "CLOSED",
          minutesWorked: 360,
          clockInAt: "2026-07-22T16:00:00.000Z",
          clockOutAt: "2026-07-22T22:00:00.000Z",
        },
        {
          shiftId: "shift-2",
          shiftName: "Lunch service",
          shiftDate: "2026-07-21",
          shiftStatus: "CLOSED",
          minutesWorked: 240,
          clockInAt: "2026-07-21T08:00:00.000Z",
          clockOutAt: "2026-07-21T12:00:00.000Z",
        },
      ],
      payouts: [],
    });

    expect(reports).toHaveLength(2);
    expect(reports[1]).toMatchObject({
      id: "shift-2",
      totalPaise: 0,
      tipCount: 0,
    });
    expect(summarizeShiftReports(reports)).toEqual({
      recentTotalPaise: 10_000,
      averagePerShiftPaise: 5_000,
      bestShiftPaise: 10_000,
      tipCount: 1,
      shiftCount: 2,
    });
  });
});
