import { ShiftStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { isValidShiftTransition } from "@/lib/validation/management";
import { writeAuditLog } from "@/server/audit";

const transitionSchema = z.object({ status: z.nativeEnum(ShiftStatus) });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const { id } = await context.params;
  const shift = await getPrisma().shift.findFirst({
    where: { id, restaurantId: session.restaurantId },
    include: {
      employees: { include: { employee: true } },
      assignments: { include: { employee: true, table: true } },
      bills: { include: { tips: { include: { allocations: true } } } },
    },
  });
  return shift
    ? NextResponse.json({ shift })
    : NextResponse.json({ error: "Shift not found." }, { status: 404 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const parsed = transitionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shift status." }, { status: 400 });
  }
  const { id } = await context.params;
  const prisma = getPrisma();
  const existing = await prisma.shift.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Shift not found." }, { status: 404 });
  }
  if (!isValidShiftTransition(existing.status, parsed.data.status)) {
    return NextResponse.json(
      { error: `A ${existing.status} shift cannot move directly to ${parsed.data.status}.` },
      { status: 409 },
    );
  }

  const shift = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.shift.update({
      where: { id },
      data: {
        status: parsed.data.status,
        startedAt: parsed.data.status === "OPEN" && !existing.startedAt ? new Date() : undefined,
        closedAt: parsed.data.status === "CLOSED" ? new Date() : undefined,
        closedByUserId: parsed.data.status === "CLOSED" ? session.subjectId : undefined,
      },
    });
    await writeAuditLog(transaction, {
      restaurantId: session.restaurantId,
      actorUserId: session.subjectId,
      action: "SHIFT_STATUS_CHANGED",
      entityType: "Shift",
      entityId: id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status },
    });
    return updated;
  });
  return NextResponse.json({ shift });
}
