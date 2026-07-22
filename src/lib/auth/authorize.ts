import { getSession, type SessionPayload } from "./session";

export async function requireManagerSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || (session.role !== "MANAGER" && session.role !== "OWNER")) {
    return null;
  }
  return session;
}

export async function requireEmployeeSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session?.role === "EMPLOYEE" ? session : null;
}
