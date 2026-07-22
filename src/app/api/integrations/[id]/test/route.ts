import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { createPosAdapter } from "@/integrations/pos/registry";
import { decryptCredentials } from "@/integrations/pos/security/encryption";
import { safeIntegrationError } from "@/integrations/pos/security/redaction";
import type { PosProviderName } from "@/integrations/pos/types";
import { writeAuditLog } from "@/server/audit";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  const prisma = getPrisma();
  const integration = await prisma.posIntegration.findFirst({ where: { id, restaurantId: session.restaurantId } });
  if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  try {
    const credentials = decryptCredentials(integration.credentialsEncrypted);
    const adapter = createPosAdapter(integration.provider as PosProviderName, integration.settingsJson, credentials);
    const result = await adapter.testConnection(credentials);
    await prisma.$transaction([
      prisma.posIntegration.update({ where: { id }, data: { status: result.ok ? "CONNECTED" : "ERROR", lastError: result.ok ? null : result.message } }),
      prisma.auditLog.create({ data: { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "POS_CONNECTION_TESTED", entityType: "PosIntegration", entityId: id, newValue: { ok: result.ok, message: result.message } } }),
    ]);
    return NextResponse.json({ result });
  } catch (error) {
    const message = safeIntegrationError(error);
    await prisma.posIntegration.update({ where: { id }, data: { status: "ERROR", lastError: message } });
    await writeAuditLog(prisma, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "POS_CONNECTION_TESTED", entityType: "PosIntegration", entityId: id, newValue: { ok: false }, reason: message });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
