import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import { isDatabaseReachable } from "@/lib/database/reachability";
import { readDemoLedger } from "@/lib/demo-ledger";
import {
  applyDemoLedgerToEmployeeDashboard,
  employeeDashboardFromDemoLedger,
} from "@/lib/demo-ledger-data";
import {
  buildPersonalShiftReports,
  demoEmployeeDashboardData,
  summarizeShiftReports,
  type EmployeeAllocationKind,
  type EmployeeDashboardData,
} from "@/lib/employee-reports";

function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function labelFor(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function allocationLabel(value: EmployeeAllocationKind): string {
  if (value === "POOL") return "Pool share";
  if (value === "ADJUSTMENT") return "Adjustment";
  if (value === "REVERSAL") return "Reversal";
  return "Direct share";
}

function timeLabel(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}

export async function getEmployeeDashboardData(): Promise<EmployeeDashboardData> {
  const session = await getSession();
  const ledger = await readDemoLedger();
  if (!(await isDatabaseReachable())) {
    return employeeDashboardFromDemoLedger(ledger);
  }

  try {
    const prisma = getPrisma();
    const employee = await prisma.employee.findFirst({
      where:
        session?.role === "EMPLOYEE"
          ? {
              id: session.subjectId,
              restaurantId: session.restaurantId,
              isActive: true,
            }
          : {
              employeeCode: "W001",
              restaurant: { code: "DEMO" },
              isActive: true,
            },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        employeeCode: true,
        jobType: true,
        restaurant: {
          select: {
            code: true,
            currency: true,
            timezone: true,
          },
        },
      },
    });

    if (!employee) return demoEmployeeDashboardData;

    const [attendanceRows, allocationRows, payoutRows, assignmentRows] =
      await Promise.all([
        prisma.shiftEmployee.findMany({
          where: {
            employeeId: employee.id,
            shift: { restaurantId: employee.restaurantId },
          },
          orderBy: { clockInAt: "desc" },
          take: 12,
          select: {
            shiftId: true,
            minutesWorked: true,
            clockInAt: true,
            clockOutAt: true,
            shift: {
              select: {
                name: true,
                businessDate: true,
                status: true,
              },
            },
          },
        }),
        prisma.tipAllocation.findMany({
          where: {
            employeeId: employee.id,
            restaurantId: employee.restaurantId,
          },
          orderBy: { createdAt: "desc" },
          take: 250,
          select: {
            id: true,
            shiftId: true,
            tipId: true,
            amountPaise: true,
            allocationType: true,
            createdAt: true,
            shift: {
              select: {
                name: true,
                businessDate: true,
                status: true,
              },
            },
            tip: {
              select: {
                method: true,
                confirmedAt: true,
                bill: {
                  select: {
                    table: { select: { number: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.payout.findMany({
          where: {
            employeeId: employee.id,
            restaurantId: employee.restaurantId,
          },
          orderBy: { updatedAt: "desc" },
          take: 12,
          select: {
            shiftId: true,
            amountPaise: true,
            status: true,
          },
        }),
        prisma.tableAssignment.findMany({
          where: {
            employeeId: employee.id,
            endedAt: null,
            shift: {
              restaurantId: employee.restaurantId,
              status: "OPEN",
            },
          },
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            table: {
              select: {
                number: true,
                bills: {
                  where: { shift: { status: "OPEN" } },
                  orderBy: { openedAt: "desc" },
                  take: 1,
                  select: {
                    totalPaise: true,
                    status: true,
                    tips: {
                      where: { status: "CONFIRMED" },
                      orderBy: { confirmedAt: "desc" },
                      select: {
                        allocations: {
                          where: { employeeId: employee.id },
                          select: { amountPaise: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

    const allocations = allocationRows.map((allocation) => ({
      id: allocation.id,
      shiftId: allocation.shiftId,
      shiftName: allocation.shift.name,
      shiftDate: dateKey(allocation.shift.businessDate),
      shiftStatus: allocation.shift.status,
      tipId: allocation.tipId,
      amountPaise: allocation.amountPaise,
      allocationType: allocation.allocationType as EmployeeAllocationKind,
      createdAt: allocation.createdAt.toISOString(),
      tableNumber: allocation.tip.bill.table.number,
      method: allocation.tip.method,
    }));
    const attendance = attendanceRows.map((attendanceRow) => ({
      shiftId: attendanceRow.shiftId,
      shiftName: attendanceRow.shift.name,
      shiftDate: dateKey(attendanceRow.shift.businessDate),
      shiftStatus: attendanceRow.shift.status,
      minutesWorked: attendanceRow.minutesWorked,
      clockInAt: attendanceRow.clockInAt.toISOString(),
      clockOutAt: attendanceRow.clockOutAt?.toISOString() ?? null,
    }));
    const payouts = payoutRows.map((payout) => ({
      shiftId: payout.shiftId,
      amountPaise: payout.amountPaise,
      status: payout.status,
    }));
    const shiftReports = buildPersonalShiftReports({
      allocations,
      attendance,
      payouts,
    });

    const currentShift =
      shiftReports.find((report) => report.status === "Open") ??
      shiftReports[0] ??
      null;
    const currentShiftId = currentShift?.id;
    const assignedTables = assignmentRows.map((assignment) => {
      const bill = assignment.table.bills[0];
      const earnedPaise =
        bill && bill.tips.length > 0
          ? bill.tips.reduce(
              (tipTotal, tip) =>
                tipTotal +
                tip.allocations.reduce(
                  (allocationTotal, allocation) =>
                    allocationTotal + allocation.amountPaise,
                  0,
                ),
              0,
            )
          : null;

      return {
        id: assignment.id,
        number: assignment.table.number,
        status:
          earnedPaise !== null && earnedPaise > 0
            ? "Tip received"
            : bill
              ? "Bill ready"
              : "Assigned",
        billPaise: bill?.totalPaise ?? null,
        earnedPaise,
      };
    });
    const recentAllocations = allocations
      .filter(
        (allocation) =>
          !currentShiftId || allocation.shiftId === currentShiftId,
      )
      .slice(0, 8)
      .map((allocation) => ({
        id: allocation.id,
        tableNumber: allocation.tableNumber,
        time: timeLabel(
          new Date(allocation.createdAt),
          employee.restaurant.timezone,
        ),
        source: labelFor(allocation.method),
        amountPaise: allocation.amountPaise,
        allocationLabel: allocationLabel(allocation.allocationType),
      }));
    const employeeIdentity = {
      name: employee.name,
      firstName: employee.name.split(/\s+/)[0] ?? employee.name,
      initials: initialsFor(employee.name),
      code: employee.employeeCode,
      role: labelFor(employee.jobType),
    };

    if (
      employee.restaurant.code === "DEMO" &&
      employee.employeeCode === "W001"
    ) {
      const baselineCurrent = demoEmployeeDashboardData.currentShift;
      if (!baselineCurrent) return demoEmployeeDashboardData;
      const mergedCurrent = {
        ...baselineCurrent,
        id: currentShift?.id ?? baselineCurrent.id,
        name: currentShift?.name ?? baselineCurrent.name,
        date: currentShift?.date ?? baselineCurrent.date,
        status: currentShift?.status ?? baselineCurrent.status,
        payoutStatus:
          currentShift?.payoutStatus ?? baselineCurrent.payoutStatus,
        tipCount: baselineCurrent.tipCount + (currentShift?.tipCount ?? 0),
        directPaise:
          baselineCurrent.directPaise + (currentShift?.directPaise ?? 0),
        poolPaise: baselineCurrent.poolPaise + (currentShift?.poolPaise ?? 0),
        adjustmentsPaise:
          baselineCurrent.adjustmentsPaise +
          (currentShift?.adjustmentsPaise ?? 0),
        totalPaise:
          baselineCurrent.totalPaise + (currentShift?.totalPaise ?? 0),
        minutesWorked:
          currentShift?.minutesWorked || baselineCurrent.minutesWorked,
      };
      const mergedTables = demoEmployeeDashboardData.assignedTables.map(
        (table) => {
          const recordedTable = assignedTables.find(
            (candidate) => candidate.number === table.number,
          );
          return recordedTable ? { ...table, ...recordedTable } : { ...table };
        },
      );
      for (const table of assignedTables) {
        if (!mergedTables.some((candidate) => candidate.number === table.number)) {
          mergedTables.push(table);
        }
      }
      const reports = [
        mergedCurrent,
        ...demoEmployeeDashboardData.shiftReports
          .filter((report) => report.id !== baselineCurrent.id)
          .map((report) => ({ ...report })),
      ];

      return applyDemoLedgerToEmployeeDashboard({
        currency: employee.restaurant.currency,
        employee: employeeIdentity,
        currentShift: mergedCurrent,
        assignedTables: mergedTables,
        recentAllocations: [
          ...recentAllocations,
          ...demoEmployeeDashboardData.recentAllocations.map((allocation) => ({
            ...allocation,
          })),
        ].slice(0, 8),
        shiftReports: reports,
        summary: summarizeShiftReports(reports),
      }, ledger);
    }

    return {
      currency: employee.restaurant.currency,
      employee: employeeIdentity,
      currentShift,
      assignedTables,
      recentAllocations,
      shiftReports,
      summary: summarizeShiftReports(shiftReports),
    };
  } catch (error) {
    console.error("Unable to load the employee dashboard.", error);
    return employeeDashboardFromDemoLedger(ledger);
  }
}
