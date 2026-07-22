import { AllocationType, TipMethod, TipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/database/prisma";
import { calculateWeightedAllocation } from "@/lib/tips";
import { publicTipSchema } from "@/lib/validation/tip";
import { writeAuditLog } from "@/server/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicBillToken: string }> },
) {
  const parsed = publicTipSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the tip amount and try again." },
      { status: 400 },
    );
  }
  const { publicBillToken } = await context.params;
  const prisma = getPrisma();

  const existingTip = await prisma.tip.findUnique({
    where: { idempotencyKey: parsed.data.idempotencyKey },
    select: { id: true, status: true },
  });
  if (existingTip) {
    return NextResponse.json({ tip: existingTip, duplicate: true });
  }

  const bill = await prisma.bill.findUnique({
    where: { publicToken: publicBillToken },
    include: {
      shift: {
        include: {
          assignments: {
            where: { endedAt: null },
            select: { employeeId: true, weight: true, tableId: true },
          },
        },
      },
    },
  });

  if (!bill || bill.status !== "OPEN" || bill.shift.status !== "OPEN") {
    return NextResponse.json(
      { error: "This bill is no longer accepting tips." },
      { status: 404 },
    );
  }

  const recipients = bill.shift.assignments
    .filter((assignment) => assignment.tableId === bill.tableId)
    .map((assignment) => ({
      employeeId: assignment.employeeId,
      share: assignment.weight,
    }));
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "The restaurant needs to assign this table before accepting a tip." },
      { status: 409 },
    );
  }

  const allocations = calculateWeightedAllocation(
    parsed.data.amountPaise,
    recipients,
  );

  const tip = await prisma.$transaction(async (transaction) => {
    const created = await transaction.tip.create({
      data: {
        restaurantId: bill.restaurantId,
        billId: bill.id,
        amountPaise: parsed.data.amountPaise,
        percentage: parsed.data.percentage,
        method: TipMethod.DIGITAL,
        status: TipStatus.CONFIRMED,
        customerNote: parsed.data.customerNote || null,
        idempotencyKey: parsed.data.idempotencyKey,
        confirmedAt: new Date(),
        allocations: {
          create: allocations.map((allocation) => ({
            restaurantId: bill.restaurantId,
            shiftId: bill.shiftId,
            employeeId: allocation.employeeId,
            allocationType: AllocationType.TABLE_SPLIT,
            amountPaise: allocation.amountPaise,
            weight: allocation.share,
            calculationDetails: {
              strategy: "WEIGHTED",
              totalShares: allocation.totalShares,
              remainderPaise: allocation.remainderPaise,
              sourceAmountPaise: parsed.data.amountPaise,
            },
          })),
        },
      },
      select: { id: true, amountPaise: true, status: true },
    });
    await writeAuditLog(transaction, {
      restaurantId: bill.restaurantId,
      action: "CUSTOMER_TIP_CONFIRMED",
      entityType: "Tip",
      entityId: created.id,
      newValue: {
        billId: bill.id,
        amountPaise: created.amountPaise,
        status: created.status,
      },
    });
    return created;
  });

  return NextResponse.json({ tip }, { status: 201 });
}
