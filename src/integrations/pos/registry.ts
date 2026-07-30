import { PosIntegrationError, type PosAdapter, type PosAdapterFactory } from "./adapter";
import { GenericPosAdapter } from "./providers/generic/adapter";
import { CsvPosAdapter } from "./providers/csv/adapter";
import { ManualPosAdapter } from "./providers/manual/adapter";
import { MockPosAdapter } from "./providers/mock/adapter";
import { NormalizedWebhookAdapter } from "./providers/webhook/adapter";
import type { PosCredentials, PosProviderDescriptor, PosProviderName } from "./types";

const factories: Partial<Record<PosProviderName, PosAdapterFactory>> = {
  GENERIC_API: ({ settings, credentials }) => new GenericPosAdapter(settings, credentials),
  CHEFOS: ({ settings, credentials }) =>
    new NormalizedWebhookAdapter("CHEFOS", settings, credentials),
  UNIVERSAL_WEBHOOK: ({ settings, credentials }) =>
    new NormalizedWebhookAdapter("UNIVERSAL_WEBHOOK", settings, credentials),
  CSV_IMPORT: ({ settings }) => {
    const csvContent =
      settings && typeof settings === "object" && "csvContent" in settings
        ? (settings as { csvContent?: unknown }).csvContent
        : undefined;
    if (typeof csvContent !== "string") {
      throw new PosIntegrationError("CSV content is required for this import.", "INVALID_CONFIGURATION");
    }
    return new CsvPosAdapter(csvContent);
  },
  MANUAL: () => new ManualPosAdapter(),
  MOCK: ({ credentials }) => new MockPosAdapter(credentials),
};

export const posProviders: PosProviderDescriptor[] = [
  { provider: "GENERIC_API", label: "Generic REST API", description: "Map a documented HTTPS JSON API into TipSathi.", available: true, supportsWebhooks: true, supportsApiSync: true, supportsCsv: false },
  { provider: "CHEFOS", label: "ChefOS", description: "Receive signed, normalized ticket, employee, and tip events from ChefOS or an approved middleware mapper.", available: true, supportsWebhooks: true, supportsApiSync: false, supportsCsv: false },
  { provider: "UNIVERSAL_WEBHOOK", label: "Universal webhook", description: "Connect any system that can send the documented TipSathi JSON event contract.", available: true, supportsWebhooks: true, supportsApiSync: false, supportsCsv: false },
  { provider: "CSV_IMPORT", label: "CSV import", description: "Preview and import exported bill data with row-level validation.", available: true, supportsWebhooks: false, supportsApiSync: false, supportsCsv: true },
  { provider: "MANUAL", label: "Manual entry", description: "Keep bills, cash tips, and adjustments available without a POS connection.", available: true, supportsWebhooks: false, supportsApiSync: false, supportsCsv: false },
];

export function registerPosAdapter(provider: PosProviderName, factory: PosAdapterFactory): void {
  factories[provider] = factory;
}

export function createPosAdapter(
  provider: PosProviderName,
  settings: unknown,
  credentials: PosCredentials,
): PosAdapter {
  const factory = factories[provider];
  if (!factory) {
    throw new PosIntegrationError(
      `${provider} is not a supported POS provider.`,
      "UNSUPPORTED_PROVIDER",
    );
  }
  return factory({ settings, credentials });
}
