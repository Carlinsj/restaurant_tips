import type { Prisma, PrismaClient } from "@prisma/client";

type AuditClient = PrismaClient | Prisma.TransactionClient;

type AuditInput = {
  restaurantId: string;
  actorUserId?: string;
  actorEmployeeId?: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason?: string;
};

export function writeAuditLog(client: AuditClient, input: AuditInput) {
  return client.auditLog.create({ data: input });
}
