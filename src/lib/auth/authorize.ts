import { getSession, type SessionPayload } from "./session";
import { getPrisma } from "@/lib/database/prisma";

export async function requireManagerSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || (session.role !== "MANAGER" && session.role !== "OWNER")) {
    return null;
  }
  const user = await getPrisma().user.findFirst({
    where: {
      id: session.subjectId,
      restaurantId: session.restaurantId,
      isActive: true,
      role: { in: ["OWNER", "MANAGER"] },
    },
    select: { id: true, restaurantId: true, role: true, name: true },
  });
  return user
    ? {
        subjectId: user.id,
        restaurantId: user.restaurantId,
        role: user.role,
        name: user.name,
      }
    : null;
}

export async function requireEmployeeSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (session?.role !== "EMPLOYEE") return null;
  const employee = await getPrisma().employee.findFirst({
    where: {
      id: session.subjectId,
      restaurantId: session.restaurantId,
      isActive: true,
    },
    select: { id: true, restaurantId: true, name: true },
  });
  return employee
    ? {
        subjectId: employee.id,
        restaurantId: employee.restaurantId,
        role: "EMPLOYEE",
        name: employee.name,
      }
    : null;
}
