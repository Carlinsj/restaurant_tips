import type { PosIntegration } from "@prisma/client";

export function integrationDto(integration: PosIntegration) {
  return {
    id: integration.id,
    restaurantId: integration.restaurantId,
    provider: integration.provider,
    displayName: integration.displayName,
    status: integration.status,
    settings: integration.settingsJson,
    hasCredentials: Boolean(integration.credentialsEncrypted),
    lastSyncAt: integration.lastSyncAt,
    lastSuccessfulSyncAt: integration.lastSuccessfulSyncAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}
