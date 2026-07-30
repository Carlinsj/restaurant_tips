import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/database/prisma";
import { employeeLoginSchema } from "@/lib/validation/auth";
import { verifyCredential } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import {
  checkRateLimit,
  clearRateLimit,
} from "@/lib/auth/rate-limit";
import { getTrustedClientAddress } from "@/lib/http/client-ip";
import { readJsonBody, RequestBodyError } from "@/lib/http/request";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json(
      { error: "Enter a valid restaurant code, employee code, and PIN." },
      { status },
    );
  }
  const parsed = employeeLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid restaurant code, employee code, and PIN." },
      { status: 400 },
    );
  }

  try {
    const clientAddress = getTrustedClientAddress(request.headers);
    const accountKey = `employee-account:${parsed.data.restaurantCode}:${parsed.data.employeeCode}`;
    const ipKey = `employee-ip:${clientAddress}`;
    const [accountLimit, ipLimit] = await Promise.all([
      checkRateLimit({
        key: accountKey,
        maxAttempts: 8,
        windowMs: LOGIN_WINDOW_MS,
      }),
      checkRateLimit({
        key: ipKey,
        maxAttempts: 120,
        windowMs: LOGIN_WINDOW_MS,
      }),
    ]);
    if (!accountLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many PIN attempts. Ask your manager for help." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(accountLimit.retryAfterSeconds, ipLimit.retryAfterSeconds),
            ),
          },
        },
      );
    }

    const prisma = getPrisma();
    const employee = await prisma.employee.findFirst({
      where: {
        employeeCode: parsed.data.employeeCode,
        isActive: true,
        restaurant: { code: parsed.data.restaurantCode },
      },
    });

    const pinMatches = await verifyCredential(parsed.data.pin, employee?.pinHash);
    if (!employee || !pinMatches) {
      return NextResponse.json(
        { error: "The employee code or PIN is not correct." },
        { status: 401 },
      );
    }

    await clearRateLimit(accountKey);
    await setSession({
      subjectId: employee.id,
      restaurantId: employee.restaurantId,
      role: "EMPLOYEE",
      name: employee.name,
    });

    return NextResponse.json(
      { ok: true, redirectTo: "/employee" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Employee sign-in dependency failed.", error);
    } else {
      console.error("Employee sign-in dependency failed.");
    }
    return NextResponse.json(
      {
        error:
          "TipSathi's database is unavailable. Ask a manager to start PostgreSQL.",
      },
      { status: 503 },
    );
  }
}
