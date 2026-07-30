import {
  createManagerDemoData,
  type ManagerDashboardData,
} from "@/lib/demo-data";
import {
  demoEmployeeDashboardData,
  summarizeShiftReports,
  type EmployeeDashboardData,
} from "@/lib/employee-reports";
import type { DemoLedger } from "@/lib/demo-ledger";

const DEMO_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function applyDemoLedgerToManagerDashboard(
  dashboard: ManagerDashboardData,
  ledger: DemoLedger,
): ManagerDashboardData {
  dashboard.shift.totalTipsPaise += ledger.totalPaise;
  dashboard.shift.digitalTipsPaise += ledger.totalPaise;

  const arjun = dashboard.employees.find((employee) => employee.code === "W001");
  const priya = dashboard.employees.find((employee) => employee.code === "R001");
  if (arjun) arjun.tipsPaise += ledger.arjunPaise;
  if (priya) priya.tipsPaise += ledger.priyaPaise;

  if (ledger.totalPaise > 0) {
    const tableSix = dashboard.tables.find((table) => table.number === 6);
    if (tableSix) {
      tableSix.status = "Tip received";
      tableSix.tipPaise += ledger.totalPaise;
      tableSix.tipAllocations = [
        { name: "Arjun", amountPaise: ledger.arjunPaise },
        { name: "Priya", amountPaise: ledger.priyaPaise },
      ].filter((allocation) => allocation.amountPaise > 0);
    }
  }

  const recordedTips = ledger.events
    .filter((event) => event.amountPaise > 0)
    .map((event) => ({
      id: event.id,
      table: "Table 6",
      time: DEMO_TIME_FORMATTER.format(new Date(event.createdAt)),
      amountPaise: event.amountPaise,
      method: "Digital" as const,
      split: `Arjun ${Math.round((event.arjunPaise * 100) / event.amountPaise)}% · Priya ${Math.round((event.priyaPaise * 100) / event.amountPaise)}%`,
    }));
  dashboard.recentTips = [...recordedTips, ...dashboard.recentTips].slice(0, 5);
  return dashboard;
}

export function managerDashboardFromDemoLedger(
  ledger: DemoLedger,
): ManagerDashboardData {
  return applyDemoLedgerToManagerDashboard(createManagerDemoData(), ledger);
}

function cloneEmployeeDashboard(
  data: EmployeeDashboardData,
): EmployeeDashboardData {
  return {
    ...data,
    employee: { ...data.employee },
    currentShift: data.currentShift ? { ...data.currentShift } : null,
    assignedTables: data.assignedTables.map((table) => ({ ...table })),
    recentAllocations: data.recentAllocations.map((allocation) => ({
      ...allocation,
    })),
    shiftReports: data.shiftReports.map((report) => ({ ...report })),
    summary: { ...data.summary },
  };
}

export function applyDemoLedgerToEmployeeDashboard(
  source: EmployeeDashboardData,
  ledger: DemoLedger,
): EmployeeDashboardData {
  const data = cloneEmployeeDashboard(source);
  if (!data.currentShift) return data;

  data.currentShift.tipCount += ledger.tipCount;
  data.currentShift.directPaise += ledger.arjunPaise;
  data.currentShift.totalPaise += ledger.arjunPaise;

  const currentReport = data.shiftReports.find(
    (report) => report.id === data.currentShift?.id,
  );
  if (currentReport) {
    currentReport.tipCount = data.currentShift.tipCount;
    currentReport.directPaise = data.currentShift.directPaise;
    currentReport.poolPaise = data.currentShift.poolPaise;
    currentReport.adjustmentsPaise = data.currentShift.adjustmentsPaise;
    currentReport.totalPaise = data.currentShift.totalPaise;
  }

  if (ledger.arjunPaise > 0) {
    const tableSix = data.assignedTables.find((table) => table.number === 6);
    if (tableSix) {
      tableSix.status = "Tip received";
      tableSix.earnedPaise =
        (tableSix.earnedPaise ?? 0) + ledger.arjunPaise;
    }
  }

  const recent = ledger.events
    .filter((event) => event.arjunPaise > 0)
    .map((event) => ({
      id: `demo-${event.id}`,
      tableNumber: 6,
      time: DEMO_TIME_FORMATTER.format(new Date(event.createdAt)),
      source: "Digital",
      amountPaise: event.arjunPaise,
      allocationLabel: "Direct share",
    }));
  data.recentAllocations = [...recent, ...data.recentAllocations].slice(0, 8);
  data.summary = summarizeShiftReports(data.shiftReports);
  return data;
}

export function employeeDashboardFromDemoLedger(
  ledger: DemoLedger,
): EmployeeDashboardData {
  return applyDemoLedgerToEmployeeDashboard(
    demoEmployeeDashboardData,
    ledger,
  );
}
