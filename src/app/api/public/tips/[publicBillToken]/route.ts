import {
  AllocationType,
  Prisma,
  TipMethod,
  TipStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/database/prisma";
import { isDatabaseReachable } from "@/lib/database/reachability";
import {
  DemoLedgerLimitError,
  recordDemoTip,
} from "@/lib/demo-ledger";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getTrustedClientAddress } from "@/lib/http/client-ip";
import { readJsonBody, RequestBodyError } from "@/lib/http/request";
import { calculateTableLoadAllocation } from "@/lib/tips";
import { isValidPublicTipAmount, publicTipSchema } from "@/lib/validation/tip";
import { writeAuditLog } from "@/server/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicBillToken: string }> },
) {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json(
      { error: "Check the tip amount and try again." },
      { status },
    );
  }
  const parsed = publicTipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the tip amount and try again." },
      { status: 400 },
    );
  }
  const { publicBillToken } = await context.params;

  if (
    publicBillToken === "demo-bill" &&
    !(await isDatabaseReachable())
  ) {
    if (!isValidPublicTipAmount(200_000, parsed.data)) {
      return NextResponse.json(
        { error: "The tip amount does not match this bill." },
        { status: 400 },
      );
    }
    try {
      const recorded = await recordDemoTip({
        amountPaise: parsed.data.amountPaise,
        percentage: parsed.data.percentage ?? null,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      return NextResponse.json(
        {
          tip: {
            id: recorded.event.id,
            amountPaise: recorded.event.amountPaise,
            status: "CONFIRMED",
          },
          allocations: [
            { employeeCode: "W001", amountPaise: recorded.event.arjunPaise },
            { employeeCode: "R001", amountPaise: recorded.event.priyaPaise },
          ],
          duplicate: recorded.duplicate,
        },
        { status: recorded.duplicate ? 200 : 201 },
      );
    } catch (error) {
      if (error instanceof DemoLedgerLimitError) {
        return NextResponse.json(
          { error: "This demo session has reached its tip limit." },
          { status: 429 },
        );
      }
      throw error;
    }
  }

  const prisma = getPrisma();
  const rateLimit = await checkRateLimit({
    key: `public-tip:${publicBillToken}:${getTrustedClientAddress(request.headers)}`,
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const bill = await prisma.bill.findUnique({
    where: { publicToken: publicBillToken },
    select: {
      id: true,
      restaurantId: true,
      shiftId: true,
      totalPaise: true,
      tableId: true,
      status: true,
      restaurant: {
        select: { code: true },
      },
      shift: {
        select: {
          status: true,
          assignments: {
            where: { endedAt: null },
            select: {
              employeeId: true,
              tableId: true,
            },
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

  if (!isValidPublicTipAmount(bill.totalPaise, parsed.data)) {
    return NextResponse.json(
      { error: "The tip amount does not match this bill." },
      { status: 400 },
    );
  }

  const existingTip = await prisma.tip.findUnique({
    where: {
      billId_idempotencyKey: {
        billId: bill.id,
        idempotencyKey: parsed.data.idempotencyKey,
      },
    },
    select: { id: true, status: true },
  });
  if (existingTip) {
    return NextResponse.json({ tip: existingTip, duplicate: true });
  }

  const isInteractiveDemo =
    publicBillToken === "demo-bill" && bill.restaurant.code === "DEMO";
  const demoAssignments = isInteractiveDemo ? bill.shift.assignments : [];
  if (
    isInteractiveDemo &&
    parsed.data.amountPaise > 0 &&
    !demoAssignments.some((assignment) => assignment.tableId === bill.tableId)
  ) {
    return NextResponse.json(
      { error: "Assign the demo table to staff before recording its tip." },
      { status: 409 },
    );
  }
  const demoAllocations =
    isInteractiveDemo && parsed.data.amountPaise > 0
      ? calculateTableLoadAllocation(
          parsed.data.amountPaise,
          bill.tableId,
          demoAssignments.map((assignment) => ({
            employeeId: assignment.employeeId,
            tableId: assignment.tableId,
          })),
          { allocationKey: parsed.data.idempotencyKey },
        )
      : [];

  try {
    const tip = await prisma.$transaction(async (transaction) => {
      const created = await transaction.tip.create({
        data: {
          restaurantId: bill.restaurantId,
          billId: bill.id,
          amountPaise: parsed.data.amountPaise,
          percentage: parsed.data.percentage,
          method: TipMethod.DIGITAL,
          status: isInteractiveDemo
            ? TipStatus.CONFIRMED
            : TipStatus.PENDING,
          confirmedAt: isInteractiveDemo ? new Date() : null,
          customerNote: parsed.data.customerNote || null,
          idempotencyKey: parsed.data.idempotencyKey,
          allocations:
            demoAllocations.length > 0
              ? {
                  create: demoAllocations.map((allocation) => ({
                    restaurantId: bill.restaurantId,
                    shiftId: bill.shiftId,
                    employeeId: allocation.employeeId,
                    allocationType: AllocationType.TABLE_SPLIT,
                    amountPaise: allocation.amountPaise,
                    weight: allocation.shareBasisPoints,
                    calculationDetails: {
                      strategy: "INVERSE_TABLE_LOAD_V2",
                      source: "INTERACTIVE_DEMO",
                      activeTableCount: allocation.activeTableCount,
                      shareBasisPoints: allocation.shareBasisPoints,
                      remainderPaise: allocation.remainderPaise,
                      remainderTieBreaker: allocation.remainderTieBreaker,
                      remainderSeed: allocation.remainderSeed,
                    },
                  })),
                }
              : undefined,
        },
        select: { id: true, amountPaise: true, status: true },
      });
      await writeAuditLog(transaction, {
        restaurantId: bill.restaurantId,
        action: isInteractiveDemo
          ? "DEMO_CUSTOMER_TIP_CONFIRMED"
          : "CUSTOMER_TIP_SUBMITTED",
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = await prisma.tip.findUnique({
        where: {
          billId_idempotencyKey: {
            billId: bill.id,
            idempotencyKey: parsed.data.idempotencyKey,
          },
        },
        select: { id: true, status: true },
      });
      if (duplicate) {
        return NextResponse.json({ tip: duplicate, duplicate: true });
      }
    }
    throw error;
  }
}
