import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { hashCredential } from "@/lib/auth/password";
import { getPrisma } from "@/lib/database/prisma";
import { parseJsonRequest } from "@/lib/http/request";
import { employeeCreateSchema } from "@/lib/validation/management";
import { writeAuditLog } from "@/server/audit";

export async function GET() {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }

  const employees = await getPrisma().employee.findMany({
    where: { restaurantId: session.restaurantId },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      jobType: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, employeeCreateSchema);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the employee name, code, role, and 4–6 digit PIN." },
      { status: parsed.status },
    );
  }

  const prisma = getPrisma();
  try {
    const pinHash = await hashCredential(parsed.data.pin);
    const employee = await prisma.$transaction(async (transaction) => {
      const created = await transaction.employee.create({
        data: {
          restaurantId: session.restaurantId,
          name: parsed.data.name,
          employeeCode: parsed.data.employeeCode,
          pinHash,
          jobType: parsed.data.jobType,
        },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          jobType: true,
          isActive: true,
        },
      });
      await writeAuditLog(transaction, {
        restaurantId: session.restaurantId,
        actorUserId: session.subjectId,
        action: "EMPLOYEE_CREATED",
        entityType: "Employee",
        entityId: created.id,
        newValue: created,
      });
      return created;
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "That employee code is already in use at this restaurant." },
      { status: 409 },
    );
  }
}
