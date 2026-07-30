import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { encryptCredentials } from "@/integrations/pos/security/encryption";
import { integrationDto } from "@/integrations/pos/presentation";
import { createPosAdapter } from "@/integrations/pos/registry";
import { safeIntegrationError } from "@/integrations/pos/security/redaction";
import { integrationCreateSchema } from "@/lib/validation/integration";
import { parseJsonRequest } from "@/lib/http/request";
import { writeAuditLog } from "@/server/audit";

export async function GET() {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const integrations = await getPrisma().posIntegration.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ integrations: integrations.map(integrationDto) });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = await parseJsonRequest(request, integrationCreateSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the provider name, settings, and credentials." }, { status: parsed.status });
  }
  const isInboundWebhook =
    parsed.data.provider === "CHEFOS" ||
    parsed.data.provider === "UNIVERSAL_WEBHOOK";
  const webhookSecret = isInboundWebhook
    ? randomBytes(32).toString("hex")
    : undefined;
  const credentials = webhookSecret
    ? { webhookSecret }
    : parsed.data.credentials;
  if (isInboundWebhook) {
    try {
      const adapter = createPosAdapter(
        parsed.data.provider,
        parsed.data.settings,
        credentials,
      );
      await adapter.testConnection(credentials);
    } catch (error) {
      return NextResponse.json(
        { error: safeIntegrationError(error) },
        { status: 400 },
      );
    }
  }
  const credentialsEncrypted =
    Object.keys(credentials).length > 0
      ? encryptCredentials(credentials)
      : null;
  const prisma = getPrisma();
  try {
    const integration = await prisma.$transaction(async (transaction) => {
      const created = await transaction.posIntegration.create({
        data: {
          restaurantId: session.restaurantId,
          provider: parsed.data.provider,
          displayName: parsed.data.displayName,
          settingsJson: parsed.data.settings as Prisma.InputJsonValue,
          credentialsEncrypted,
          status:
            parsed.data.provider === "MANUAL" ||
            parsed.data.provider === "CSV_IMPORT" ||
            isInboundWebhook
              ? "CONNECTED"
              : "DISCONNECTED",
        },
      });
      await writeAuditLog(transaction, {
        restaurantId: session.restaurantId,
        actorUserId: session.subjectId,
        action: "POS_INTEGRATION_CREATED",
        entityType: "PosIntegration",
        entityId: created.id,
        newValue: { provider: created.provider, displayName: created.displayName, hasCredentials: Boolean(credentialsEncrypted) },
      });
      return created;
    });
    return NextResponse.json(
      {
        integration: integrationDto(integration),
        webhookSetup: webhookSecret
          ? {
              endpointPath: `/api/integrations/pos/${integration.id}/webhook`,
              signingHeader: "x-tipsathi-signature",
              signingAlgorithm: "HMAC-SHA256",
              secret: webhookSecret,
            }
          : undefined,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "An integration with that display name already exists." }, { status: 409 });
  }
}
