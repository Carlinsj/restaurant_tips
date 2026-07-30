import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const DEVELOPMENT_SESSION_COOKIE = "tipsathi_session";
const PRODUCTION_SESSION_COOKIE = "__Host-tipsathi_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const SESSION_ISSUER = "tipsathi";
const SESSION_AUDIENCE = "tipsathi-web";

export type SessionRole = "OWNER" | "MANAGER" | "EMPLOYEE";

export type SessionPayload = {
  subjectId: string;
  restaurantId: string;
  role: SessionRole;
  name: string;
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({
    restaurantId: payload.restaurantId,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.subjectId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function readSessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (
      !payload.sub ||
      typeof payload.restaurantId !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "OWNER" &&
        payload.role !== "MANAGER" &&
        payload.role !== "EMPLOYEE")
    ) {
      return null;
    }
    return {
      subjectId: payload.sub,
      restaurantId: payload.restaurantId,
      role: payload.role,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(PRODUCTION_SESSION_COOKIE)?.value ??
    cookieStore.get(DEVELOPMENT_SESSION_COOKIE)?.value;
  return token ? readSessionToken(token) : null;
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  const cookieName =
    process.env.NODE_ENV === "production"
      ? PRODUCTION_SESSION_COOKIE
      : DEVELOPMENT_SESSION_COOKIE;
  cookieStore.set(cookieName, await createSessionToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    priority: "high",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PRODUCTION_SESSION_COOKIE);
  cookieStore.delete(DEVELOPMENT_SESSION_COOKIE);
}
