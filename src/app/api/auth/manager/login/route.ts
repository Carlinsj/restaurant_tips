import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/database/prisma";
import { managerLoginSchema } from "@/lib/validation/auth";
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
      { error: "Check the restaurant code, email, and password." },
      { status },
    );
  }
  const parsed = managerLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the restaurant code, email, and password." },
      { status: 400 },
    );
  }

  try {
    const clientAddress = getTrustedClientAddress(request.headers);
    const accountKey = `manager-account:${parsed.data.restaurantCode}:${parsed.data.email}`;
    const ipKey = `manager-ip:${clientAddress}`;
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
        { error: "Too many login attempts. Please wait and try again." },
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
    const user = await prisma.user.findFirst({
      where: {
        email: parsed.data.email,
        isActive: true,
        role: { in: ["OWNER", "MANAGER"] },
        restaurant: { code: parsed.data.restaurantCode },
      },
    });

    const passwordMatches = await verifyCredential(
      parsed.data.password,
      user?.passwordHash,
    );
    if (!user || !passwordMatches) {
      return NextResponse.json(
        { error: "The restaurant code, email, or password is not correct." },
        { status: 401 },
      );
    }

    await clearRateLimit(accountKey);
    await setSession({
      subjectId: user.id,
      restaurantId: user.restaurantId,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json(
      { ok: true, redirectTo: "/manager" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Manager sign-in dependency failed.", error);
    } else {
      console.error("Manager sign-in dependency failed.");
    }
    return NextResponse.json(
      {
        error:
          "TipSathi's database is unavailable. Start PostgreSQL and try again.",
      },
      { status: 503 },
    );
  }
}
