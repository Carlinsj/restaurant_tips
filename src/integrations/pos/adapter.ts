import type {
  ConnectionTestResult,
  ExternalBill,
  ExternalEmployee,
  ExternalOutlet,
  ExternalTable,
  NormalizedPosEvent,
  PosCredentials,
  PosProviderName,
  PosSyncContext,
  PosWebhookInput,
  WebhookVerificationInput,
} from "./types";

export interface PosAdapter {
  readonly providerName: PosProviderName;

  testConnection(credentials: PosCredentials): Promise<ConnectionTestResult>;
  getBills(context: PosSyncContext): Promise<ExternalBill[]>;
  getEmployees(context: PosSyncContext): Promise<ExternalEmployee[]>;
  getTables(context: PosSyncContext): Promise<ExternalTable[]>;
  getOutlets(context: PosSyncContext): Promise<ExternalOutlet[]>;
  handleWebhook(input: PosWebhookInput): Promise<NormalizedPosEvent[]>;
  verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean>;
}

export type PosAdapterFactory = (options: {
  settings: unknown;
  credentials: PosCredentials;
}) => PosAdapter;

export class PosIntegrationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_CONFIGURATION"
      | "CONNECTION_FAILED"
      | "AUTHENTICATION_FAILED"
      | "INVALID_RESPONSE"
      | "TIMEOUT"
      | "UNSUPPORTED_PROVIDER"
      | "UNSAFE_URL"
      | "MAPPING_REQUIRED",
  ) {
    super(message);
    this.name = "PosIntegrationError";
  }
}
