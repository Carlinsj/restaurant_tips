import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
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
  if (!session || session.role !== "EMPLOYEE") {
    return demoEmployeeDashboardData;
  }

  try {
    const prisma = getPrisma();
    const employee = await prisma.employee.findFirst({
      where: {
        id: session.subjectId,
        restaurantId: session.restaurantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        jobType: true,
        restaurant: {
          select: {
            code: true,
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
            shift: { restaurantId: session.restaurantId },
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
            restaurantId: session.restaurantId,
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
            restaurantId: session.restaurantId,
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
              restaurantId: session.restaurantId,
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
                      take: 1,
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

    if (shiftReports.every((report) => report.totalPaise === 0)) {
      if (employee.restaurant.code === "DEMO") {
        return {
          ...demoEmployeeDashboardData,
          employee: {
            name: employee.name,
            firstName: employee.name.split(/\s+/)[0] ?? employee.name,
            initials: initialsFor(employee.name),
            code: employee.employeeCode,
            role: labelFor(employee.jobType),
          },
        };
      }
    }

    const currentShift =
      shiftReports.find((report) => report.status === "Open") ??
      shiftReports[0] ??
      null;
    const currentShiftId = currentShift?.id;

    return {
      employee: {
        name: employee.name,
        firstName: employee.name.split(/\s+/)[0] ?? employee.name,
        initials: initialsFor(employee.name),
        code: employee.employeeCode,
        role: labelFor(employee.jobType),
      },
      currentShift,
      assignedTables: assignmentRows.map((assignment) => {
        const bill = assignment.table.bills[0];
        const earnedPaise =
          bill?.tips[0]?.allocations.reduce(
            (total, allocation) => total + allocation.amountPaise,
            0,
          ) ?? null;

        return {
          id: assignment.id,
          number: assignment.table.number,
          status: earnedPaise ? "Tip received" : bill ? "Open bill" : "Assigned",
          billPaise: bill?.totalPaise ?? null,
          earnedPaise,
        };
      }),
      recentAllocations: allocations
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
        })),
      shiftReports,
      summary: summarizeShiftReports(shiftReports),
    };
  } catch (error) {
    console.error("Unable to load the employee dashboard.", error);
    return demoEmployeeDashboardData;
  }
}
