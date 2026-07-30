import { createHash } from "node:crypto";
import { Prisma, type PosIntegration } from "@prisma/client";
import { getPrisma } from "@/lib/database/prisma";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { writeAuditLog } from "@/server/audit";
import { createPosAdapter } from "./registry";
import { decryptCredentials } from "./security/encryption";
import { redactSecrets, safeIntegrationError } from "./security/redaction";
import { processNormalizedPosEvent } from "./sync-service";
import type { PosProviderName } from "./types";

type WebhookResult = {
  accepted: boolean;
  duplicate: boolean;
  processed: number;
  ignored: number;
  status: number;
  message: string;
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(redactSecrets(value))) as Prisma.InputJsonValue;
}

function safeRawPayload(rawBody: string): Prisma.InputJsonValue {
  try {
    return jsonValue(JSON.parse(rawBody));
  } catch {
    return { bodySha256: createHash("sha256").update(rawBody).digest("hex") };
  }
}

async function storeRejectedWebhook(
  integration: PosIntegration,
  rawBody: string,
): Promise<void> {
  const prisma = getPrisma();
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const providerEventId = `rejected:${bodyHash}`;
  const existing = await prisma.posWebhookEvent.findUnique({
    where: {
      posIntegrationId_providerEventId: {
        posIntegrationId: integration.id,
        providerEventId,
      },
    },
  });
  if (existing) return;
  const event = await prisma.posWebhookEvent.create({
    data: {
      restaurantId: integration.restaurantId,
      posIntegrationId: integration.id,
      providerEventId,
      eventType: "SIGNATURE_REJECTED",
      payloadJson: safeRawPayload(rawBody),
      signatureValid: false,
      status: "FAILED",
      errorMessage: "Webhook signature could not be verified.",
      processedAt: new Date(),
    },
  });
  await writeAuditLog(prisma, {
    restaurantId: integration.restaurantId,
    action: "POS_WEBHOOK_REJECTED",
    entityType: "PosWebhookEvent",
    entityId: event.id,
    reason: "Signature verification failed.",
  });
}

export async function handlePosWebhook(input: {
  integrationId: string;
  rawBody: string;
  headers: Headers;
  clientAddress: string;
}): Promise<WebhookResult> {
  const webhookLimit = await checkRateLimit({
    key: `webhook:${input.integrationId}:${input.clientAddress}`,
    maxAttempts: 120,
    windowMs: 60_000,
  });
  if (!webhookLimit.allowed) {
    return { accepted: false, duplicate: false, processed: 0, ignored: 0, status: 429, message: "Webhook rate limit exceeded." };
  }
  const prisma = getPrisma();
  const integration = await prisma.posIntegration.findFirst({
    where: { id: input.integrationId, status: { in: ["CONNECTED", "ERROR", "DISCONNECTED"] } },
  });
  if (!integration) {
    return { accepted: false, duplicate: false, processed: 0, ignored: 0, status: 404, message: "Integration not found." };
  }
  const credentials = decryptCredentials(integration.credentialsEncrypted);
  const adapter = createPosAdapter(
    integration.provider as PosProviderName,
    integration.settingsJson,
    credentials,
  );
  const signature =
    input.headers.get("x-tipsathi-signature") ??
    input.headers.get("x-pos-signature") ??
    input.headers.get("x-signature");
  const valid = await adapter.verifyWebhookSignature({
    rawBody: input.rawBody,
    headers: input.headers,
    signature,
  });
  if (!valid) {
    await storeRejectedWebhook(integration, input.rawBody);
    return { accepted: false, duplicate: false, processed: 0, ignored: 0, status: 401, message: "The webhook signature could not be verified." };
  }

  const normalizedEvents = await adapter.handleWebhook({
    rawBody: input.rawBody,
    headers: input.headers,
  });
  let processed = 0;
  let ignored = 0;
  let duplicate = false;

  for (const normalized of normalizedEvents) {
    const existing = await prisma.posWebhookEvent.findUnique({
      where: {
        posIntegrationId_providerEventId: {
          posIntegrationId: integration.id,
          providerEventId: normalized.providerEventId,
        },
      },
    });
    if (existing) {
      duplicate = true;
      continue;
    }
    const stored = await prisma.posWebhookEvent.create({
      data: {
        restaurantId: integration.restaurantId,
        posIntegrationId: integration.id,
        providerEventId: normalized.providerEventId,
        eventType: normalized.eventType,
        payloadJson: jsonValue(normalized.rawPayload ?? normalized),
        signatureValid: true,
        status: "RECEIVED",
      },
    });
    try {
      const outcome = await processNormalizedPosEvent({ integration, event: normalized });
      const eventStatus = outcome === "processed" ? "PROCESSED" : "IGNORED";
      await prisma.posWebhookEvent.update({
        where: { id: stored.id },
        data: { status: eventStatus, processedAt: new Date() },
      });
      if (outcome === "processed") processed += 1;
      else ignored += 1;
      await writeAuditLog(prisma, {
        restaurantId: integration.restaurantId,
        action: outcome === "processed" ? "POS_WEBHOOK_PROCESSED" : "POS_WEBHOOK_IGNORED",
        entityType: "PosWebhookEvent",
        entityId: stored.id,
        newValue: { eventType: normalized.eventType, providerEventId: normalized.providerEventId },
      });
    } catch (error) {
      const message = safeIntegrationError(error);
      await prisma.posWebhookEvent.update({
        where: { id: stored.id },
        data: { status: "FAILED", errorMessage: message, processedAt: new Date() },
      });
      await writeAuditLog(prisma, {
        restaurantId: integration.restaurantId,
        action: "POS_WEBHOOK_FAILED",
        entityType: "PosWebhookEvent",
        entityId: stored.id,
        reason: message,
      });
      ignored += 1;
    }
  }
  return {
    accepted: true,
    duplicate,
    processed,
    ignored,
    status: 200,
    message: duplicate && processed === 0 && ignored === 0 ? "Webhook already processed." : "Webhook accepted.",
  };
}
