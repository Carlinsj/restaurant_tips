import { randomUUID } from "node:crypto";
import { AllocationType, TipMethod, TipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { parseJsonRequest } from "@/lib/http/request";
import { calculateTableLoadAllocation } from "@/lib/tips";
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
  const parsed = await parseJsonRequest(request, manualTipSchema);
  if (!parsed.success) return NextResponse.json({ error: "Enter a positive tip amount and a reason." }, { status: parsed.status });
  const prisma = getPrisma();
  const allocationKey = randomUUID();
  const result = await prisma.$transaction(async (transaction) => {
    const bill = await transaction.bill.findFirst({
      where: { id: parsed.data.billId, restaurantId: session.restaurantId, status: { in: ["OPEN", "PAID"] } },
    });
    if (!bill) {
      return {
        error: "Bill not found or no longer accepts tips.",
        status: 404,
      } as const;
    }
    const assignments = await transaction.tableAssignment.findMany({
      where: { shiftId: bill.shiftId, endedAt: null },
      select: { employeeId: true, tableId: true },
    });
    if (!assignments.some((assignment) => assignment.tableId === bill.tableId)) {
      return {
        error: "Assign at least one employee to this table first.",
        status: 409,
      } as const;
    }
    const allocations = calculateTableLoadAllocation(
      parsed.data.amountPaise,
      bill.tableId,
      assignments,
      { allocationKey },
    );
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
            weight: allocation.shareBasisPoints,
            calculationDetails: { strategy: "INVERSE_TABLE_LOAD_V2", source: parsed.data.method, reason: parsed.data.reason, activeTableCount: allocation.activeTableCount, shareBasisPoints: allocation.shareBasisPoints, remainderPaise: allocation.remainderPaise, remainderTieBreaker: allocation.remainderTieBreaker, remainderSeed: allocation.remainderSeed },
          })),
        },
      },
    });
    await writeAuditLog(transaction, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "MANUAL_TIP_CREATED", entityType: "Tip", entityId: created.id, newValue: { amountPaise: created.amountPaise, method: created.method, billId: created.billId }, reason: parsed.data.reason });
    return { tip: created } as const;
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ tip: result.tip }, { status: 201 });
}
