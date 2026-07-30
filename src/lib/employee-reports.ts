export type EmployeeAllocationKind =
  | "DIRECT"
  | "TABLE_SPLIT"
  | "POOL"
  | "ADJUSTMENT"
  | "REVERSAL";

export type EmployeeAllocationRecord = {
  id: string;
  shiftId: string;
  shiftName: string;
  shiftDate: string;
  shiftStatus: string;
  tipId: string;
  amountPaise: number;
  allocationType: EmployeeAllocationKind;
  createdAt: string;
  tableNumber: number | null;
  method: string;
};

export type EmployeeAttendanceRecord = {
  shiftId: string;
  shiftName: string;
  shiftDate: string;
  shiftStatus: string;
  minutesWorked: number;
  clockInAt: string;
  clockOutAt: string | null;
};

export type EmployeePayoutRecord = {
  shiftId: string;
  amountPaise: number;
  status: string;
};

export type PersonalShiftReport = {
  id: string;
  name: string;
  date: string;
  status: string;
  payoutStatus: string;
  tipCount: number;
  directPaise: number;
  poolPaise: number;
  adjustmentsPaise: number;
  totalPaise: number;
  minutesWorked: number;
};

export type EmployeeDashboardData = {
  currency: string;
  employee: {
    name: string;
    firstName: string;
    initials: string;
    code: string;
    role: string;
  };
  currentShift: PersonalShiftReport | null;
  assignedTables: {
    id: string;
    number: number;
    status: string;
    billPaise: number | null;
    earnedPaise: number | null;
  }[];
  recentAllocations: {
    id: string;
    tableNumber: number | null;
    time: string;
    source: string;
    amountPaise: number;
    allocationLabel: string;
  }[];
  shiftReports: PersonalShiftReport[];
  summary: {
    recentTotalPaise: number;
    averagePerShiftPaise: number;
    bestShiftPaise: number;
    tipCount: number;
    shiftCount: number;
  };
};

function toLabel(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function resolvePayoutStatus(
  shiftStatus: string,
  payout: EmployeePayoutRecord | undefined,
): string {
  if (payout) return toLabel(payout.status);
  if (shiftStatus === "PAID") return "Paid";
  if (shiftStatus === "CLOSED") return "Pending";
  return "In progress";
}

export function buildPersonalShiftReports({
  allocations,
  attendance,
  payouts,
}: {
  allocations: EmployeeAllocationRecord[];
  attendance: EmployeeAttendanceRecord[];
  payouts: EmployeePayoutRecord[];
}): PersonalShiftReport[] {
  const reports = new Map<
    string,
    PersonalShiftReport & { tipIds: Set<string> }
  >();

  for (const shift of attendance) {
    const payout = payouts.find((item) => item.shiftId === shift.shiftId);
    reports.set(shift.shiftId, {
      id: shift.shiftId,
      name: shift.shiftName,
      date: shift.shiftDate,
      status: toLabel(shift.shiftStatus),
      payoutStatus: resolvePayoutStatus(shift.shiftStatus, payout),
      tipCount: 0,
      directPaise: 0,
      poolPaise: 0,
      adjustmentsPaise: 0,
      totalPaise: 0,
      minutesWorked: shift.minutesWorked,
      tipIds: new Set<string>(),
    });
  }

  for (const allocation of allocations) {
    let report = reports.get(allocation.shiftId);
    if (!report) {
      const payout = payouts.find((item) => item.shiftId === allocation.shiftId);
      report = {
        id: allocation.shiftId,
        name: allocation.shiftName,
        date: allocation.shiftDate,
        status: toLabel(allocation.shiftStatus),
        payoutStatus: resolvePayoutStatus(allocation.shiftStatus, payout),
        tipCount: 0,
        directPaise: 0,
        poolPaise: 0,
        adjustmentsPaise: 0,
        totalPaise: 0,
        minutesWorked: 0,
        tipIds: new Set<string>(),
      };
      reports.set(allocation.shiftId, report);
    }

    report.tipIds.add(allocation.tipId);
    report.totalPaise += allocation.amountPaise;

    if (
      allocation.allocationType === "DIRECT" ||
      allocation.allocationType === "TABLE_SPLIT"
    ) {
      report.directPaise += allocation.amountPaise;
    } else if (allocation.allocationType === "POOL") {
      report.poolPaise += allocation.amountPaise;
    } else {
      report.adjustmentsPaise += allocation.amountPaise;
    }
  }

  for (const report of reports.values()) {
    report.tipCount = report.tipIds.size;
  }

  return [...reports.values()]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((report) => ({
      id: report.id,
      name: report.name,
      date: report.date,
      status: report.status,
      payoutStatus: report.payoutStatus,
      tipCount: report.tipCount,
      directPaise: report.directPaise,
      poolPaise: report.poolPaise,
      adjustmentsPaise: report.adjustmentsPaise,
      totalPaise: report.totalPaise,
      minutesWorked: report.minutesWorked,
    }));
}

export function summarizeShiftReports(
  reports: PersonalShiftReport[],
): EmployeeDashboardData["summary"] {
  const recentTotalPaise = reports.reduce(
    (total, report) => total + report.totalPaise,
    0,
  );
  const tipCount = reports.reduce(
    (total, report) => total + report.tipCount,
    0,
  );

  return {
    recentTotalPaise,
    averagePerShiftPaise:
      reports.length > 0 ? Math.round(recentTotalPaise / reports.length) : 0,
    bestShiftPaise: reports.reduce(
      (best, report) => Math.max(best, report.totalPaise),
      0,
    ),
    tipCount,
    shiftCount: reports.length,
  };
}

const demoShiftReports: PersonalShiftReport[] = [
  {
    id: "dinner-current",
    name: "Dinner service",
    date: "2026-07-22",
    status: "Open",
    payoutStatus: "In progress",
    tipCount: 7,
    directPaise: 114_800,
    poolPaise: 55_200,
    adjustmentsPaise: 0,
    totalPaise: 170_000,
    minutesWorked: 240,
  },
  {
    id: "dinner-2026-07-21",
    name: "Dinner service",
    date: "2026-07-21",
    status: "Paid",
    payoutStatus: "Paid",
    tipCount: 11,
    directPaise: 151_200,
    poolPaise: 64_800,
    adjustmentsPaise: 0,
    totalPaise: 216_000,
    minutesWorked: 390,
  },
  {
    id: "lunch-2026-07-20",
    name: "Lunch service",
    date: "2026-07-20",
    status: "Paid",
    payoutStatus: "Paid",
    tipCount: 7,
    directPaise: 91_000,
    poolPaise: 39_000,
    adjustmentsPaise: 0,
    totalPaise: 130_000,
    minutesWorked: 330,
  },
  {
    id: "dinner-2026-07-19",
    name: "Dinner service",
    date: "2026-07-19",
    status: "Closed",
    payoutStatus: "Approved",
    tipCount: 9,
    directPaise: 126_700,
    poolPaise: 54_300,
    adjustmentsPaise: 0,
    totalPaise: 181_000,
    minutesWorked: 375,
  },
];

export const demoEmployeeDashboardData: EmployeeDashboardData = {
  currency: "INR",
  employee: {
    name: "Arjun Mehta",
    firstName: "Arjun",
    initials: "AM",
    code: "W001",
    role: "Waiter",
  },
  currentShift: demoShiftReports[0],
  assignedTables: [
    {
      id: "table-3",
      number: 3,
      status: "Bill ready",
      billPaise: 245_000,
      earnedPaise: null,
    },
    {
      id: "table-6",
      number: 6,
      status: "Bill ready",
      billPaise: 200_000,
      earnedPaise: null,
    },
  ],
  recentAllocations: [
    {
      id: "allocation-1",
      tableNumber: 1,
      time: "9:18 PM",
      source: "Digital",
      amountPaise: 12_600,
      allocationLabel: "Direct share",
    },
    {
      id: "allocation-8",
      tableNumber: 8,
      time: "8:54 PM",
      source: "Cash",
      amountPaise: 8_750,
      allocationLabel: "Direct share",
    },
  ],
  shiftReports: demoShiftReports,
  summary: summarizeShiftReports(demoShiftReports),
};
