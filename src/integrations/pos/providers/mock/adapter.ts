import { createHmac, timingSafeEqual } from "node:crypto";
import type { PosAdapter } from "../../adapter";
import type {
  ConnectionTestResult,
  ExternalBill,
  ExternalEmployee,
  ExternalOutlet,
  ExternalTable,
  NormalizedPosEvent,
  PosCredentials,
  PosWebhookInput,
  WebhookVerificationInput,
} from "../../types";

const mockEmployees: ExternalEmployee[] = [
  { externalEmployeeId: "mock-emp-w001", employeeCode: "W001", name: "Arjun", role: "WAITER", isActive: true },
  { externalEmployeeId: "mock-emp-r001", employeeCode: "R001", name: "Priya", role: "RUNNER", isActive: true },
];

const mockTables: ExternalTable[] = [
  { externalTableId: "mock-table-12", tableNumber: 12, name: "Table 12", capacity: 4, isActive: true },
];

const mockBill: ExternalBill = {
  externalBillId: "mock-bill-inv-1024",
  externalOutletId: "mock-main-outlet",
  externalTableId: "mock-table-12",
  externalEmployeeId: "mock-emp-w001",
  externalTipId: "mock-tip-inv-1024",
  billNumber: "INV-1024",
  tableName: "Table 12",
  employeeName: "Arjun",
  subtotalPaise: 185_000,
  taxPaise: 15_000,
  totalPaise: 200_000,
  tipPaise: 20_000,
  currency: "INR",
  status: "PAID",
  openedAt: new Date("2026-07-22T14:00:00.000Z"),
  paidAt: new Date("2026-07-22T15:20:00.000Z"),
};

export class MockPosAdapter implements PosAdapter {
  readonly providerName = "MOCK" as const;

  constructor(private readonly credentials: PosCredentials = {}) {}

  async testConnection(): Promise<ConnectionTestResult> {
    return { ok: true, message: "Mock POS connected.", latencyMs: 12, details: { environment: "development" } };
  }

  async getBills(): Promise<ExternalBill[]> {
    return [{ ...mockBill }];
  }

  async getEmployees(): Promise<ExternalEmployee[]> {
    return mockEmployees.map((employee) => ({ ...employee }));
  }

  async getTables(): Promise<ExternalTable[]> {
    return mockTables.map((table) => ({ ...table }));
  }

  async getOutlets(): Promise<ExternalOutlet[]> {
    return [{ externalOutletId: "mock-main-outlet", name: "Main Outlet", code: "MAIN", timezone: "Asia/Kolkata" }];
  }

  async verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean> {
    const secret = this.credentials.webhookSecret ?? "mock-webhook-secret";
    if (!input.signature) return false;
    const supplied = input.signature.replace(/^sha256=/i, "");
    if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
    const expected = createHmac("sha256", secret).update(input.rawBody).digest("hex");
    return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
  }

  async handleWebhook(input: PosWebhookInput): Promise<NormalizedPosEvent[]> {
    const payload = JSON.parse(input.rawBody) as { eventId?: unknown; eventType?: unknown };
    return [{
      providerEventId: typeof payload.eventId === "string" ? payload.eventId : "mock-event",
      eventType: payload.eventType === "BILL_PAID" ? "BILL_PAID" : "UNKNOWN",
      bill: payload.eventType === "BILL_PAID" ? { ...mockBill } : undefined,
      rawPayload: payload,
    }];
  }
}
