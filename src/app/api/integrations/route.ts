import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { encryptCredentials } from "@/integrations/pos/security/encryption";
import { integrationDto } from "@/integrations/pos/presentation";
import { integrationCreateSchema } from "@/lib/validation/integration";
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
  const parsed = integrationCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the provider name, settings, and credentials." }, { status: 400 });
  }
  if (parsed.data.provider === "MOCK" && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "The mock provider is available only in development." }, { status: 400 });
  }
  const credentialsEncrypted =
    Object.keys(parsed.data.credentials).length > 0
      ? encryptCredentials(parsed.data.credentials)
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
          status: parsed.data.provider === "MANUAL" || parsed.data.provider === "CSV_IMPORT" ? "CONNECTED" : "DISCONNECTED",
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
    return NextResponse.json({ integration: integrationDto(integration) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An integration with that display name already exists." }, { status: 409 });
  }
}
