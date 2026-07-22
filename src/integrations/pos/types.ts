export type PosProviderName =
  | "GENERIC_API"
  | "CSV_IMPORT"
  | "MANUAL"
  | "MOCK"
  | "PETPOOJA"
  | "RESTROWORKS"
  | "CUSTOM";

export type ExternalBillStatus = "OPEN" | "PAID" | "CANCELLED" | "REFUNDED";

export type NormalizedPosEventType =
  | "BILL_CREATED"
  | "BILL_UPDATED"
  | "BILL_PAID"
  | "BILL_CANCELLED"
  | "BILL_REFUNDED"
  | "TIP_CONFIRMED"
  | "PAYMENT_CONFIRMED"
  | "EMPLOYEE_UPDATED"
  | "TABLE_UPDATED"
  | "UNKNOWN";

export type PosCredentials = Record<string, string>;

export interface ExternalOutlet {
  externalOutletId: string;
  name: string;
  code?: string;
  timezone?: string;
  rawPayload?: unknown;
}

export interface ExternalEmployee {
  externalEmployeeId: string;
  employeeCode?: string;
  name: string;
  role?: string;
  isActive: boolean;
  updatedAt?: Date;
  rawPayload?: unknown;
}

export interface ExternalTable {
  externalTableId: string;
  tableNumber?: number;
  name: string;
  capacity?: number;
  isActive: boolean;
  updatedAt?: Date;
  rawPayload?: unknown;
}

export interface ExternalPayment {
  externalPaymentId: string;
  externalBillId: string;
  amountPaise: number;
  tipPaise?: number;
  method?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
  paidAt?: Date;
  rawPayload?: unknown;
}

export interface ExternalTip {
  externalTipId: string;
  externalBillId: string;
  amountPaise: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
  confirmedAt?: Date;
  rawPayload?: unknown;
}

export interface ExternalBill {
  externalBillId: string;
  externalOutletId?: string;
  externalTableId?: string;
  externalEmployeeId?: string;
  externalTipId?: string;
  billNumber: string;
  tableName?: string;
  employeeName?: string;
  subtotalPaise: number;
  taxPaise?: number;
  totalPaise: number;
  tipPaise?: number;
  currency: string;
  status: ExternalBillStatus;
  openedAt?: Date;
  paidAt?: Date;
  updatedAt?: Date;
  rawPayload?: unknown;
}

export interface NormalizedPosEvent {
  providerEventId: string;
  eventType: NormalizedPosEventType;
  occurredAt?: Date;
  bill?: ExternalBill;
  employee?: ExternalEmployee;
  table?: ExternalTable;
  payment?: ExternalPayment;
  tip?: ExternalTip;
  rawPayload?: unknown;
}

export interface PosSyncContext {
  restaurantId: string;
  integrationId: string;
  since?: Date;
}

export interface PosWebhookInput {
  rawBody: string;
  headers: Headers;
}

export interface WebhookVerificationInput extends PosWebhookInput {
  signature: string | null;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  details?: Record<string, string | number | boolean>;
}

export interface PosProviderDescriptor {
  provider: PosProviderName;
  label: string;
  description: string;
  available: boolean;
  supportsWebhooks: boolean;
  supportsApiSync: boolean;
  supportsCsv: boolean;
}
