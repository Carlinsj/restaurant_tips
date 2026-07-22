import { AllocationType, TipMethod, TipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { calculateWeightedAllocation } from "@/lib/tips";
import { manualTipSchema } from "@/lib/validation/management";
import { writeAuditLog } from "@/server/audit";

export async function GET() {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const tips = await getPrisma().tip.findMany({
    where: { restaurantId: session.restaurantId },
    include: { bill: { select: { billNumber: true, tableId: true } }, allocations: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ tips });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = manualTipSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a positive tip amount and a reason." }, { status: 400 });
  const prisma = getPrisma();
  const bill = await prisma.bill.findFirst({
    where: { id: parsed.data.billId, restaurantId: session.restaurantId, status: { in: ["OPEN", "PAID"] } },
  });
  if (!bill) return NextResponse.json({ error: "Bill not found or no longer accepts tips." }, { status: 404 });
  const assignments = await prisma.tableAssignment.findMany({
    where: { shiftId: bill.shiftId, tableId: bill.tableId, endedAt: null },
    select: { employeeId: true, weight: true },
  });
  if (assignments.length === 0) return NextResponse.json({ error: "Assign at least one employee to this table first." }, { status: 409 });
  const allocations = calculateWeightedAllocation(parsed.data.amountPaise, assignments.map((assignment) => ({ employeeId: assignment.employeeId, share: assignment.weight })));
  const tip = await prisma.$transaction(async (transaction) => {
    const created = await transaction.tip.create({
      data: {
        restaurantId: session.restaurantId,
        billId: bill.id,
        amountPaise: parsed.data.amountPaise,
        method: parsed.data.method === "CASH" ? TipMethod.CASH : TipMethod.MANUAL,
        status: TipStatus.CONFIRMED,
        confirmedAt: new Date(),
        createdByUserId: session.subjectId,
        customerNote: parsed.data.reason,
        allocations: {
          create: allocations.map((allocation) => ({
            restaurantId: session.restaurantId,
            shiftId: bill.shiftId,
            employeeId: allocation.employeeId,
            allocationType: AllocationType.TABLE_SPLIT,
            amountPaise: allocation.amountPaise,
            weight: allocation.share,
            calculationDetails: { strategy: "WEIGHTED", source: parsed.data.method, reason: parsed.data.reason, totalShares: allocation.totalShares, remainderPaise: allocation.remainderPaise },
          })),
        },
      },
    });
    await writeAuditLog(transaction, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "MANUAL_TIP_CREATED", entityType: "Tip", entityId: created.id, newValue: { amountPaise: created.amountPaise, method: created.method, billId: created.billId }, reason: parsed.data.reason });
    return created;
  });
  return NextResponse.json({ tip }, { status: 201 });
}
