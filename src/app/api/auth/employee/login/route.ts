import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/database/prisma";
import { employeeLoginSchema } from "@/lib/validation/auth";
import { verifyCredential } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
} from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const parsed = employeeLoginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid restaurant code, employee code, and PIN." },
      { status: 400 },
    );
  }

  const clientAddress = request.headers.get("x-forwarded-for") ?? "local";
  const rateLimitKey = `employee:${clientAddress}:${parsed.data.employeeCode}`;
  const rateLimit = checkLoginRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many PIN attempts. Ask your manager for help." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const prisma = getPrisma();
    const employee = await prisma.employee.findFirst({
      where: {
        employeeCode: parsed.data.employeeCode,
        isActive: true,
        restaurant: { code: parsed.data.restaurantCode },
      },
    });

    if (
      !employee ||
      !(await verifyCredential(parsed.data.pin, employee.pinHash))
    ) {
      return NextResponse.json(
        { error: "The employee code or PIN is not correct." },
        { status: 401 },
      );
    }

    clearLoginAttempts(rateLimitKey);
    await setSession({
      subjectId: employee.id,
      restaurantId: employee.restaurantId,
      role: "EMPLOYEE",
      name: employee.name,
    });

    return NextResponse.json({ ok: true, redirectTo: "/employee" });
  } catch (error) {
    console.error("Employee sign-in dependency failed.", error);
    return NextResponse.json(
      {
        error:
          "TipSathi's database is unavailable. Ask a manager to start PostgreSQL.",
      },
      { status: 503 },
    );
  }
}
