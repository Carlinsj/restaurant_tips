import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { parseJsonRequest } from "@/lib/http/request";
import { manualBillSchema } from "@/lib/validation/management";
import { writeAuditLog } from "@/server/audit";

export async function GET() {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const bills = await getPrisma().bill.findMany({
    where: { restaurantId: session.restaurantId },
    include: { table: { select: { number: true, name: true } }, tips: true },
    orderBy: { openedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ bills });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = await parseJsonRequest(request, manualBillSchema);
  if (!parsed.success || parsed.data.subtotalPaise + parsed.data.taxPaise !== parsed.data.totalPaise) {
    return NextResponse.json({ error: "Bill amounts must be valid paise values and subtotal plus tax must equal total." }, { status: parsed.success ? 400 : parsed.status });
  }
  const prisma = getPrisma();
  const [shift, table] = await Promise.all([
    prisma.shift.findFirst({ where: { id: parsed.data.shiftId, restaurantId: session.restaurantId, status: "OPEN" } }),
    prisma.restaurantTable.findFirst({ where: { id: parsed.data.tableId, restaurantId: session.restaurantId, isActive: true } }),
  ]);
  if (!shift || !table) return NextResponse.json({ error: "Choose an open shift and active table from this restaurant." }, { status: 409 });
  try {
    const bill = await prisma.$transaction(async (transaction) => {
      const created = await transaction.bill.create({
        data: { ...parsed.data, restaurantId: session.restaurantId },
      });
      await writeAuditLog(transaction, {
        restaurantId: session.restaurantId,
        actorUserId: session.subjectId,
        action: "MANUAL_BILL_CREATED",
        entityType: "Bill",
        entityId: created.id,
        newValue: { billNumber: created.billNumber, totalPaise: created.totalPaise, shiftId: created.shiftId, tableId: created.tableId },
      });
      return created;
    });
    return NextResponse.json({ bill }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "That bill number is already in use." }, { status: 409 });
  }
}
