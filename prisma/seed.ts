import {
  DistributionStrategy,
  JobType,
  PrismaClient,
  ShiftStatus,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to create known demo credentials in production. Set ALLOW_DEMO_SEED=true only for an isolated demo environment.",
    );
  }
  const [passwordHash, pinHash] = await Promise.all([
    hash("TipSathi123!", 12),
    hash("1234", 12),
  ]);

  const restaurant = await prisma.restaurant.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      name: "Demo Restaurant",
      code: "DEMO",
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  await prisma.user.upsert({
    where: {
      restaurantId_email: {
        restaurantId: restaurant.id,
        email: "manager@demo.in",
      },
    },
    update: { passwordHash },
    create: {
      restaurantId: restaurant.id,
      name: "Demo Manager",
      email: "manager@demo.in",
      passwordHash,
      role: UserRole.MANAGER,
    },
  });

  const employees = await Promise.all(
    [
      { name: "Arjun Mehta", employeeCode: "W001", jobType: JobType.WAITER },
      { name: "Priya Shah", employeeCode: "R001", jobType: JobType.RUNNER },
    ].map((employee) =>
      prisma.employee.upsert({
        where: {
          restaurantId_employeeCode: {
            restaurantId: restaurant.id,
            employeeCode: employee.employeeCode,
          },
        },
        update: { pinHash },
        create: {
          ...employee,
          restaurantId: restaurant.id,
          pinHash,
        },
      }),
    ),
  );

  const tables = await Promise.all(
    [...Array.from({ length: 10 }, (_, index) => index + 1), 12].map((number) =>
      prisma.restaurantTable.upsert({
        where: {
          restaurantId_number: { restaurantId: restaurant.id, number },
        },
        update: {},
        create: {
          restaurantId: restaurant.id,
          number,
          name: `Table ${number}`,
          capacity: number === 1 || number === 2 ? 2 : 4,
        },
      }),
    ),
  );

  let shift = await prisma.shift.findFirst({
    where: {
      restaurantId: restaurant.id,
      name: "Dinner service",
      status: ShiftStatus.OPEN,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!shift) {
    shift = await prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        name: "Dinner service",
        businessDate: new Date(),
        status: ShiftStatus.OPEN,
        startedAt: new Date(),
        employees: {
          create: employees.map((employee, index) => ({
            employeeId: employee.id,
            clockInAt: new Date(
              Date.now() - (index === 0 ? 4 : 3) * 60 * 60 * 1000,
            ),
            points: index === 0 ? 10 : 6,
            isActive: true,
          })),
        },
        assignments: {
          create: [
            {
              tableId: tables[2].id,
              employeeId: employees[0].id,
              assignmentRole: JobType.WAITER,
              weight: 100,
              startedAt: new Date(),
              isPrimary: true,
            },
            {
              tableId: tables[5].id,
              employeeId: employees[0].id,
              assignmentRole: JobType.WAITER,
              weight: 100,
              startedAt: new Date(),
              isPrimary: true,
            },
            {
              tableId: tables[1].id,
              employeeId: employees[1].id,
              assignmentRole: JobType.RUNNER,
              weight: 100,
              startedAt: new Date(),
            },
            {
              tableId: tables[2].id,
              employeeId: employees[1].id,
              assignmentRole: JobType.RUNNER,
              weight: 100,
              startedAt: new Date(),
            },
            {
              tableId: tables[5].id,
              employeeId: employees[1].id,
              assignmentRole: JobType.RUNNER,
              weight: 100,
              startedAt: new Date(),
            },
          ],
        },
        bills: {
          create: {
            restaurantId: restaurant.id,
            tableId: tables[5].id,
            billNumber: "DEMO-INV-1024",
            publicToken: "demo-bill",
            subtotalPaise: 185_000,
            taxPaise: 15_000,
            totalPaise: 200_000,
          },
        },
      },
    });
  }

  const desiredAssignments = [
    {
      tableId: tables[2].id,
      employeeId: employees[0].id,
      assignmentRole: JobType.WAITER,
      isPrimary: true,
    },
    {
      tableId: tables[5].id,
      employeeId: employees[0].id,
      assignmentRole: JobType.WAITER,
      isPrimary: true,
    },
    {
      tableId: tables[1].id,
      employeeId: employees[1].id,
      assignmentRole: JobType.RUNNER,
      isPrimary: false,
    },
    {
      tableId: tables[2].id,
      employeeId: employees[1].id,
      assignmentRole: JobType.RUNNER,
      isPrimary: false,
    },
    {
      tableId: tables[5].id,
      employeeId: employees[1].id,
      assignmentRole: JobType.RUNNER,
      isPrimary: false,
    },
  ];
  const currentAssignments = await prisma.tableAssignment.findMany({
    where: { shiftId: shift.id, endedAt: null },
    select: { employeeId: true, tableId: true },
  });
  for (const assignment of desiredAssignments) {
    const exists = currentAssignments.some(
      (current) =>
        current.employeeId === assignment.employeeId &&
        current.tableId === assignment.tableId,
    );
    if (exists) {
      await prisma.tableAssignment.updateMany({
        where: {
          shiftId: shift.id,
          employeeId: assignment.employeeId,
          tableId: assignment.tableId,
          endedAt: null,
        },
        data: {
          assignmentRole: assignment.assignmentRole,
          isPrimary: assignment.isPrimary,
          weight: 100,
        },
      });
    } else {
      await prisma.tableAssignment.create({
        data: {
          shiftId: shift.id,
          ...assignment,
          weight: 100,
          startedAt: new Date(),
        },
      });
    }
  }

  const existingRule = await prisma.tipRule.findFirst({
    where: {
      restaurantId: restaurant.id,
      isDefault: true,
    },
  });
  const workloadRule = {
    name: "Workload-balanced table split",
    strategy: DistributionStrategy.WEIGHTED,
    isDefault: true,
    configuration: {
      version: 2,
      formula: "inverse_active_table_count",
      remainderTieBreaker: "hashed_allocation_key",
      description:
        "Eligible staff weight = 1 / distinct active tables; exact remainder ties rotate deterministically by allocation key",
    },
  };
  if (existingRule) {
    await prisma.tipRule.update({
      where: { id: existingRule.id },
      data: workloadRule,
    });
  } else {
    await prisma.tipRule.create({
      data: {
        restaurantId: restaurant.id,
        ...workloadRule,
      },
    });
  }

  console.info(`Seeded TipSathi demo shift ${shift.id}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
