import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { integrationDto } from "@/integrations/pos/presentation";
import { encryptCredentials } from "@/integrations/pos/security/encryption";
import { integrationUpdateSchema } from "@/lib/validation/integration";
import { writeAuditLog } from "@/server/audit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  const integration = await getPrisma().posIntegration.findFirst({
    where: { id, restaurantId: session.restaurantId },
    include: {
      _count: { select: { employeeMappings: true, tableMappings: true, billMappings: true, webhookEvents: true, syncRuns: true } },
    },
  });
  if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  return NextResponse.json({ integration: { ...integrationDto(integration), counts: integration._count } });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = integrationUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "The integration update is invalid." }, { status: 400 });
  const { id } = await context.params;
  const prisma = getPrisma();
  const existing = await prisma.posIntegration.findFirst({ where: { id, restaurantId: session.restaurantId } });
  if (!existing) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  const credentialsEncrypted = parsed.data.credentials
    ? encryptCredentials(parsed.data.credentials)
    : undefined;
  const integration = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.posIntegration.update({
      where: { id },
      data: {
        displayName: parsed.data.displayName,
        settingsJson: parsed.data.settings as Prisma.InputJsonValue | undefined,
        credentialsEncrypted,
        status: parsed.data.status,
      },
    });
    await writeAuditLog(transaction, {
      restaurantId: session.restaurantId,
      actorUserId: session.subjectId,
      action: credentialsEncrypted ? "POS_CREDENTIALS_UPDATED" : "POS_INTEGRATION_UPDATED",
      entityType: "PosIntegration",
      entityId: id,
      previousValue: { displayName: existing.displayName, status: existing.status },
      newValue: { displayName: updated.displayName, status: updated.status, credentialsUpdated: Boolean(credentialsEncrypted) },
    });
    return updated;
  });
  return NextResponse.json({ integration: integrationDto(integration) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  const prisma = getPrisma();
  const existing = await prisma.posIntegration.findFirst({ where: { id, restaurantId: session.restaurantId } });
  if (!existing) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  await prisma.$transaction(async (transaction) => {
    await transaction.posIntegration.update({
      where: { id },
      data: { status: "DISABLED", credentialsEncrypted: null },
    });
    await writeAuditLog(transaction, {
      restaurantId: session.restaurantId,
      actorUserId: session.subjectId,
      action: "POS_INTEGRATION_DISCONNECTED",
      entityType: "PosIntegration",
      entityId: id,
      previousValue: { status: existing.status },
      newValue: { status: "DISABLED", credentialsRemoved: true },
    });
  });
  return NextResponse.json({ ok: true });
}
