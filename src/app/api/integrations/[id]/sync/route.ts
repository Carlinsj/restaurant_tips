import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { syncPosIntegration } from "@/integrations/pos/sync-service";
import { safeIntegrationError } from "@/integrations/pos/security/redaction";
import { writeAuditLog } from "@/server/audit";
import { getPrisma } from "@/lib/database/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  const prisma = getPrisma();
  await writeAuditLog(prisma, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "POS_MANUAL_SYNC_STARTED", entityType: "PosIntegration", entityId: id });
  try {
    const result = await syncPosIntegration({ restaurantId: session.restaurantId, integrationId: id, actorUserId: session.subjectId, syncType: "MANUAL" });
    await writeAuditLog(prisma, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: result.status === "COMPLETED" ? "POS_MANUAL_SYNC_COMPLETED" : "POS_MANUAL_SYNC_PARTIAL", entityType: "PosSyncRun", entityId: result.syncRunId, newValue: { created: result.created, updated: result.updated, ignored: result.ignored } });
    return NextResponse.json({ result });
  } catch (error) {
    const message = safeIntegrationError(error);
    await writeAuditLog(prisma, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "POS_MANUAL_SYNC_FAILED", entityType: "PosIntegration", entityId: id, reason: message });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
