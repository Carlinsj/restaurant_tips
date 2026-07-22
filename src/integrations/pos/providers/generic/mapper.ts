import { parseRupeesToPaise } from "@/lib/currency";
import { PosIntegrationError } from "../../adapter";
import { redactSecrets } from "../../security/redaction";
import type {
  ExternalBill,
  ExternalBillStatus,
  ExternalEmployee,
  ExternalOutlet,
  ExternalTable,
  NormalizedPosEventType,
} from "../../types";
import type { GenericPosSettings } from "./schemas";

const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

export function getNestedValue(input: unknown, path: string): unknown {
  if (!path.trim()) return input;
  return path.split(".").reduce<unknown>((current, segment) => {
    if (UNSAFE_PATH_SEGMENTS.has(segment)) return undefined;
    if (!current || typeof current !== "object") return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, input);
}

function requiredString(value: unknown, label: string): string {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") {
    throw new PosIntegrationError(`The POS response is missing ${label}.`, "INVALID_RESPONSE");
  }
  return String(value).trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function optionalBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "active"].includes(normalized)) return true;
    if (["false", "no", "0", "inactive"].includes(normalized)) return false;
  }
  return fallback;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : undefined;
}

function optionalDate(value: unknown): Date | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parseExternalMoneyToPaise(
  value: unknown,
  unit: "RUPEES" | "PAISE",
  label: string,
): number {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new PosIntegrationError(`The POS response contains an invalid ${label}.`, "INVALID_RESPONSE");
  }
  const normalized = String(value).trim();
  try {
    if (unit === "PAISE") {
      if (!/^\d+$/.test(normalized)) throw new Error("not integer paise");
      const paise = Number(normalized);
      if (!Number.isSafeInteger(paise) || paise < 0) throw new Error("unsafe paise");
      return paise;
    }
    return parseRupeesToPaise(normalized);
  } catch {
    throw new PosIntegrationError(`The POS response contains an invalid ${label}.`, "INVALID_RESPONSE");
  }
}

export function normalizeExternalStatus(
  value: unknown,
  mappings: Record<string, ExternalBillStatus> = {},
): ExternalBillStatus {
  const raw = optionalString(value)?.toUpperCase() ?? "";
  const configured = mappings[raw] ?? mappings[optionalString(value) ?? ""];
  if (configured) return configured;
  if (raw === "OPEN" || raw === "PAID" || raw === "CANCELLED" || raw === "REFUNDED") {
    return raw;
  }
  return "OPEN";
}

export function mapGenericBill(
  raw: Record<string, unknown>,
  settings: GenericPosSettings,
): ExternalBill {
  const fields = settings.billFields;
  const read = (path: string | undefined) => (path ? getNestedValue(raw, path) : undefined);
  const taxValue = read(fields.tax);
  const tipValue = read(fields.tip);
  return {
    externalBillId: requiredString(read(fields.billId), "bill ID"),
    externalOutletId: optionalString(read(fields.outletId)),
    externalTableId: optionalString(read(fields.tableId)),
    externalEmployeeId: optionalString(read(fields.employeeId)),
    externalTipId: optionalString(read(fields.tipId)),
    billNumber: requiredString(read(fields.billNumber), "bill number"),
    tableName: optionalString(read(fields.tableName)),
    employeeName: optionalString(read(fields.employeeName)),
    subtotalPaise: parseExternalMoneyToPaise(read(fields.subtotal), settings.moneyUnit, "subtotal"),
    taxPaise: taxValue === undefined ? 0 : parseExternalMoneyToPaise(taxValue, settings.moneyUnit, "tax"),
    totalPaise: parseExternalMoneyToPaise(read(fields.total), settings.moneyUnit, "total"),
    tipPaise: tipValue === undefined ? undefined : parseExternalMoneyToPaise(tipValue, settings.moneyUnit, "tip amount"),
    currency: optionalString(read(fields.currency)) ?? "INR",
    status: normalizeExternalStatus(read(fields.status), settings.statusMappings),
    openedAt: optionalDate(read(fields.openedAt)),
    paidAt: optionalDate(read(fields.paidAt)),
    updatedAt: optionalDate(read(fields.updatedAt)),
    rawPayload: redactSecrets(raw),
  };
}

export function mapGenericEmployee(
  raw: Record<string, unknown>,
  settings: GenericPosSettings,
): ExternalEmployee {
  const fields = settings.employeeFields;
  if (!fields) throw new PosIntegrationError("Employee field mappings are not configured.", "INVALID_CONFIGURATION");
  const read = (path: string | undefined) => (path ? getNestedValue(raw, path) : undefined);
  return {
    externalEmployeeId: requiredString(read(fields.employeeId), "employee ID"),
    employeeCode: optionalString(read(fields.employeeCode)),
    name: requiredString(read(fields.name), "employee name"),
    role: optionalString(read(fields.role)),
    isActive: optionalBoolean(read(fields.isActive)),
    updatedAt: optionalDate(read(fields.updatedAt)),
    rawPayload: redactSecrets(raw),
  };
}

export function mapGenericTable(
  raw: Record<string, unknown>,
  settings: GenericPosSettings,
): ExternalTable {
  const fields = settings.tableFields;
  if (!fields) throw new PosIntegrationError("Table field mappings are not configured.", "INVALID_CONFIGURATION");
  const read = (path: string | undefined) => (path ? getNestedValue(raw, path) : undefined);
  return {
    externalTableId: requiredString(read(fields.tableId), "table ID"),
    tableNumber: optionalPositiveInteger(read(fields.tableNumber)),
    name: requiredString(read(fields.name), "table name"),
    capacity: optionalPositiveInteger(read(fields.capacity)),
    isActive: optionalBoolean(read(fields.isActive)),
    updatedAt: optionalDate(read(fields.updatedAt)),
    rawPayload: redactSecrets(raw),
  };
}

export function mapGenericOutlet(
  raw: Record<string, unknown>,
  settings: GenericPosSettings,
): ExternalOutlet {
  const fields = settings.outletFields;
  if (!fields) throw new PosIntegrationError("Outlet field mappings are not configured.", "INVALID_CONFIGURATION");
  const read = (path: string | undefined) => (path ? getNestedValue(raw, path) : undefined);
  return {
    externalOutletId: requiredString(read(fields.outletId), "outlet ID"),
    name: requiredString(read(fields.name), "outlet name"),
    code: optionalString(read(fields.code)),
    timezone: optionalString(read(fields.timezone)),
    rawPayload: redactSecrets(raw),
  };
}

export function normalizeEventType(
  value: unknown,
  mappings: Record<string, NormalizedPosEventType>,
): NormalizedPosEventType {
  const raw = optionalString(value) ?? "";
  const normalized = raw.toUpperCase();
  return mappings[raw] ?? mappings[normalized] ?? (
    [
      "BILL_CREATED", "BILL_UPDATED", "BILL_PAID", "BILL_CANCELLED",
      "BILL_REFUNDED", "TIP_CONFIRMED", "PAYMENT_CONFIRMED",
      "EMPLOYEE_UPDATED", "TABLE_UPDATED",
    ].includes(normalized)
      ? (normalized as NormalizedPosEventType)
      : "UNKNOWN"
  );
}
