import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { parseJsonRequest } from "@/lib/http/request";
import { tableCreateSchema } from "@/lib/validation/management";
import { writeAuditLog } from "@/server/audit";

export async function GET() {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const tables = await getPrisma().restaurantTable.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { number: "asc" },
  });
  return NextResponse.json({ tables });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const parsed = await parseJsonRequest(request, tableCreateSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid table name, number, and capacity." }, { status: parsed.status });
  }

  const prisma = getPrisma();
  try {
    const table = await prisma.$transaction(async (transaction) => {
      const created = await transaction.restaurantTable.create({
        data: { ...parsed.data, restaurantId: session.restaurantId },
      });
      await writeAuditLog(transaction, {
        restaurantId: session.restaurantId,
        actorUserId: session.subjectId,
        action: "TABLE_CREATED",
        entityType: "RestaurantTable",
        entityId: created.id,
        newValue: {
          name: created.name,
          number: created.number,
          capacity: created.capacity,
        },
      });
      return created;
    });
    return NextResponse.json({ table }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "That table number already exists." }, { status: 409 });
  }
}
