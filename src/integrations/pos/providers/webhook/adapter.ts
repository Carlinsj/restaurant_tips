import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeCurrencyCode } from "@/lib/currency";
import { PosIntegrationError, type PosAdapter } from "../../adapter";
import type {
  ConnectionTestResult,
  ExternalBill,
  ExternalEmployee,
  ExternalOutlet,
  ExternalTable,
  NormalizedPosEvent,
  PosCredentials,
  PosProviderName,
  PosWebhookInput,
  WebhookVerificationInput,
} from "../../types";
import {
  normalizedWebhookPayloadSchema,
  normalizedWebhookSettingsSchema,
  type NormalizedWebhookEventInput,
  type NormalizedWebhookSettings,
} from "./schemas";

type WebhookProviderName = Extract<
  PosProviderName,
  "CHEFOS" | "UNIVERSAL_WEBHOOK"
>;

function mapEvent(
  event: NormalizedWebhookEventInput,
  settings: NormalizedWebhookSettings,
): NormalizedPosEvent {
  const bill = event.data.bill;
  const employee = event.data.employee;
  const table = event.data.table;
  return {
    providerEventId: event.id,
    eventType: event.type,
    occurredAt: event.occurredAt,
    bill: bill
      ? {
          externalBillId: bill.id,
          externalOutletId: bill.outletId,
          externalTableId: bill.tableId,
          externalEmployeeId: bill.employeeId,
          externalTipId: bill.tipId,
          billNumber: bill.number,
          tableName: bill.tableName,
          employeeName: bill.employeeName,
          subtotalPaise: bill.subtotalMinor,
          taxPaise: bill.taxMinor,
          totalPaise: bill.totalMinor,
          tipPaise: bill.tipMinor,
          currency: normalizeCurrencyCode(
            bill.currency ?? settings.defaultCurrency,
          ),
          status: bill.status,
          openedAt: bill.openedAt,
          paidAt: bill.paidAt,
          updatedAt: bill.updatedAt,
          rawPayload: bill,
        }
      : undefined,
    employee: employee
      ? {
          externalEmployeeId: employee.id,
          employeeCode: employee.code,
          name: employee.name,
          role: employee.role,
          isActive: employee.isActive,
          updatedAt: employee.updatedAt,
          rawPayload: employee,
        }
      : undefined,
    table: table
      ? {
          externalTableId: table.id,
          tableNumber: table.number,
          name: table.name,
          capacity: table.capacity,
          isActive: table.isActive,
          updatedAt: table.updatedAt,
          rawPayload: table,
        }
      : undefined,
    rawPayload: event,
  };
}

export class NormalizedWebhookAdapter implements PosAdapter {
  private readonly settings: NormalizedWebhookSettings;

  constructor(
    readonly providerName: WebhookProviderName,
    settings: unknown,
    private readonly credentials: PosCredentials,
  ) {
    const parsed = normalizedWebhookSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      throw new PosIntegrationError(
        "The webhook settings are incomplete or invalid.",
        "INVALID_CONFIGURATION",
      );
    }
    try {
      normalizeCurrencyCode(parsed.data.defaultCurrency);
    } catch {
      throw new PosIntegrationError(
        "The default currency is not a supported ISO 4217 code.",
        "INVALID_CONFIGURATION",
      );
    }
    this.settings = parsed.data;
  }

  async testConnection(
    credentials: PosCredentials,
  ): Promise<ConnectionTestResult> {
    if (!credentials.webhookSecret) {
      throw new PosIntegrationError(
        "A webhook signing secret is required.",
        "INVALID_CONFIGURATION",
      );
    }
    return {
      ok: true,
      message: "The secure webhook endpoint is ready to receive a test event.",
      details: { inboundWebhook: true },
    };
  }

  async getBills(): Promise<ExternalBill[]> {
    return [];
  }

  async getEmployees(): Promise<ExternalEmployee[]> {
    return [];
  }

  async getTables(): Promise<ExternalTable[]> {
    return [];
  }

  async getOutlets(): Promise<ExternalOutlet[]> {
    return [];
  }

  async verifyWebhookSignature(
    input: WebhookVerificationInput,
  ): Promise<boolean> {
    const secret = this.credentials.webhookSecret;
    if (!secret || !input.signature) return false;
    const supplied = input.signature.replace(/^sha256=/i, "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
    const expected = createHmac("sha256", secret)
      .update(input.rawBody)
      .digest("hex");
    return timingSafeEqual(
      Buffer.from(supplied, "hex"),
      Buffer.from(expected, "hex"),
    );
  }

  async handleWebhook(input: PosWebhookInput): Promise<NormalizedPosEvent[]> {
    let payload: unknown;
    try {
      payload = JSON.parse(input.rawBody);
    } catch {
      throw new PosIntegrationError(
        "The webhook body is not valid JSON.",
        "INVALID_RESPONSE",
      );
    }
    const parsed = normalizedWebhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new PosIntegrationError(
        "The webhook does not match the TipSathi event contract.",
        "INVALID_RESPONSE",
      );
    }
    const events = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    return events.map((event) => mapEvent(event, this.settings));
  }
}
