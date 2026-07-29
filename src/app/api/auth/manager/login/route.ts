import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/database/prisma";
import { managerLoginSchema } from "@/lib/validation/auth";
import { verifyCredential } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
} from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const parsed = managerLoginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the restaurant code, email, and password." },
      { status: 400 },
    );
  }

  const clientAddress = request.headers.get("x-forwarded-for") ?? "local";
  const rateLimitKey = `manager:${clientAddress}:${parsed.data.email}`;
  const rateLimit = checkLoginRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: {
        email: parsed.data.email,
        isActive: true,
        role: { in: ["OWNER", "MANAGER"] },
        restaurant: { code: parsed.data.restaurantCode },
      },
    });

    if (!user || !(await verifyCredential(parsed.data.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "The login details did not match an active manager." },
        { status: 401 },
      );
    }

    clearLoginAttempts(rateLimitKey);
    await setSession({
      subjectId: user.id,
      restaurantId: user.restaurantId,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json({ ok: true, redirectTo: "/manager" });
  } catch (error) {
    console.error("Manager sign-in dependency failed.", error);
    return NextResponse.json(
      {
        error:
          "TipSathi's database is unavailable. Start PostgreSQL and try again.",
      },
      { status: 503 },
    );
  }
}
