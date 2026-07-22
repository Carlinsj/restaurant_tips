import type { PosAdapter } from "../../adapter";
import type { ConnectionTestResult, ExternalBill, ExternalEmployee, ExternalOutlet, ExternalTable, NormalizedPosEvent } from "../../types";

export class ManualPosAdapter implements PosAdapter {
  readonly providerName = "MANUAL" as const;
  async testConnection(): Promise<ConnectionTestResult> { return { ok: true, message: "Manual entry is available." }; }
  async getBills(): Promise<ExternalBill[]> { return []; }
  async getEmployees(): Promise<ExternalEmployee[]> { return []; }
  async getTables(): Promise<ExternalTable[]> { return []; }
  async getOutlets(): Promise<ExternalOutlet[]> { return []; }
  async handleWebhook(): Promise<NormalizedPosEvent[]> { return []; }
  async verifyWebhookSignature(): Promise<boolean> { return false; }
}
