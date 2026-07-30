import { getPrisma } from "@/lib/database/prisma";
import { isDatabaseReachable } from "@/lib/database/reachability";
import { readDemoLedger } from "@/lib/demo-ledger";
import { applyDemoLedgerToManagerDashboard } from "@/lib/demo-ledger-data";
import {
  createManagerDemoData,
  type DemoRecentTip,
  type ManagerDashboardData,
} from "@/lib/demo-data";

const DEMO_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export async function getManagerDashboardData(): Promise<ManagerDashboardData> {
  const dashboard = createManagerDemoData();
  const ledger = await readDemoLedger();
  if (!(await isDatabaseReachable())) {
    return applyDemoLedgerToManagerDashboard(dashboard, ledger);
  }
  try {
    const tips = await getPrisma().tip.findMany({
      where: {
        status: "CONFIRMED",
        restaurant: { code: "DEMO" },
        bill: { publicToken: "demo-bill" },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        amountPaise: true,
        method: true,
        createdAt: true,
        bill: { select: { table: { select: { number: true } } } },
        allocations: {
          select: {
            amountPaise: true,
            employee: {
              select: { name: true, employeeCode: true },
            },
          },
        },
      },
    });

    const confirmedTotal = tips.reduce(
      (total, tip) => total + tip.amountPaise,
      0,
    );
    dashboard.shift.totalTipsPaise += confirmedTotal;
    dashboard.shift.digitalTipsPaise += tips
      .filter((tip) => tip.method !== "CASH")
      .reduce((total, tip) => total + tip.amountPaise, 0);
    dashboard.shift.cashTipsPaise += tips
      .filter((tip) => tip.method === "CASH")
      .reduce((total, tip) => total + tip.amountPaise, 0);

    for (const tip of tips) {
      const table = dashboard.tables.find(
        (item) => item.number === tip.bill.table.number,
      );
      if (table && tip.amountPaise > 0) {
        table.status = "Tip received";
        table.tipPaise += tip.amountPaise;
      }
      for (const allocation of tip.allocations) {
        const employee = dashboard.employees.find(
          (item) => item.code === allocation.employee.employeeCode,
        );
        if (employee) employee.tipsPaise += allocation.amountPaise;
        if (table) {
          const name = allocation.employee.name.split(/\s+/)[0] ?? "Staff";
          const existing = table.tipAllocations.find(
            (item) => item.name === name,
          );
          if (existing) existing.amountPaise += allocation.amountPaise;
          else {
            table.tipAllocations.push({
              name,
              amountPaise: allocation.amountPaise,
            });
          }
        }
      }
    }

    const recordedTips: DemoRecentTip[] = tips.map((tip) => ({
      id: tip.id,
      table: `Table ${tip.bill.table.number}`,
      time: DEMO_TIME_FORMATTER.format(tip.createdAt),
      amountPaise: tip.amountPaise,
      method: tip.method === "CASH" ? "Cash" : "Digital",
      split: tip.allocations
        .map((allocation) => {
          const percent =
            tip.amountPaise > 0
              ? Math.round((allocation.amountPaise * 100) / tip.amountPaise)
              : 0;
          return `${allocation.employee.name.split(/\s+/)[0]} ${percent}%`;
        })
        .join(" · "),
    }));
    dashboard.recentTips = [...recordedTips, ...dashboard.recentTips].slice(
      0,
      5,
    );
  } catch {
    // The visual demo remains available while PostgreSQL is offline.
  }
  return applyDemoLedgerToManagerDashboard(dashboard, ledger);
}
