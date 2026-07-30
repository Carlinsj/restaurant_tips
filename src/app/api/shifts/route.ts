import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { parseJsonRequest } from "@/lib/http/request";
import { shiftCreateSchema } from "@/lib/validation/management";
import { writeAuditLog } from "@/server/audit";

export async function GET() {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const shifts = await getPrisma().shift.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { businessDate: "desc" },
    take: 30,
  });
  return NextResponse.json({ shifts });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const parsed = await parseJsonRequest(request, shiftCreateSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a shift name and business date." }, { status: parsed.status });
  }

  const prisma = getPrisma();
  const shift = await prisma.$transaction(async (transaction) => {
    const created = await transaction.shift.create({
      data: {
        restaurantId: session.restaurantId,
        name: parsed.data.name,
        businessDate: parsed.data.businessDate,
      },
    });
    await writeAuditLog(transaction, {
      restaurantId: session.restaurantId,
      actorUserId: session.subjectId,
      action: "SHIFT_CREATED",
      entityType: "Shift",
      entityId: created.id,
      newValue: { name: created.name, status: created.status },
    });
    return created;
  });
  return NextResponse.json({ shift }, { status: 201 });
}
