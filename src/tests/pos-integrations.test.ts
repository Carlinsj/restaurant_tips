import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPosAdapter, posProviders } from "@/integrations/pos/registry";
import { decryptCredentials, encryptCredentials } from "@/integrations/pos/security/encryption";
import { redactSecrets, safeIntegrationError } from "@/integrations/pos/security/redaction";
import {
  getNestedValue,
  mapGenericBill,
  normalizeExternalStatus,
  parseExternalMoneyToPaise,
} from "@/integrations/pos/providers/generic/mapper";
import { genericPosSettingsSchema } from "@/integrations/pos/providers/generic/schemas";
import { matchExternalEmployee, matchExternalTable } from "@/integrations/pos/matching";
import { failedRowsToCsv, previewCsvImport } from "@/integrations/pos/providers/csv/parser";

const genericSettings = genericPosSettingsSchema.parse({
  baseUrl: "https://pos.example.com/api/",
  authType: "NONE",
  endpoints: { bills: "/bills" },
  moneyUnit: "RUPEES",
  billFields: {
    billId: "invoice.id",
    billNumber: "invoice.number",
    tableId: "table.id",
    tableName: "table.name",
    employeeId: "server.id",
    employeeName: "server.name",
    subtotal: "amounts.subtotal",
    tax: "amounts.tax",
    total: "amounts.total",
    tip: "amounts.tip",
    status: "status",
    paidAt: "paid_at",
  },
  statusMappings: { SETTLED: "PAID" },
});

describe("POS provider registry", () => {
  it("creates the mock provider without changing core logic", () => {
    const adapter = createPosAdapter("MOCK", {}, {});
    expect(adapter.providerName).toBe("MOCK");
    expect(posProviders.some((provider) => provider.provider === "PETPOOJA" && !provider.available)).toBe(true);
  });

  it("rejects providers without documented adapters", () => {
    expect(() => createPosAdapter("PETPOOJA", {}, {})).toThrow("not available");
  });
});

describe("generic POS normalization", () => {
  it("reads nested fields without eval or prototype traversal", () => {
    expect(getNestedValue({ invoice: { id: "abc" } }, "invoice.id")).toBe("abc");
    expect(getNestedValue({ invoice: { id: "abc" } }, "__proto__.polluted")).toBeUndefined();
  });

  it("normalizes a provider bill into paise", () => {
    const bill = mapGenericBill(
      {
        invoice: { id: "ext-1", number: "INV-1" },
        table: { id: "table-12", name: "Table 12" },
        server: { id: "emp-1", name: "Arjun" },
        amounts: { subtotal: "1850.00", tax: "150", total: "2000", tip: "200" },
        status: "SETTLED",
        paid_at: "2026-07-22T21:30:00+05:30",
      },
      genericSettings,
    );
    expect(bill).toMatchObject({
      externalBillId: "ext-1",
      billNumber: "INV-1",
      totalPaise: 200_000,
      tipPaise: 20_000,
      status: "PAID",
    });
  });

  it("uses deterministic monetary and status normalization", () => {
    expect(parseExternalMoneyToPaise("200.50", "RUPEES", "tip")).toBe(20_050);
    expect(parseExternalMoneyToPaise("20050", "PAISE", "tip")).toBe(20_050);
    expect(normalizeExternalStatus("mystery")).toBe("OPEN");
    expect(normalizeExternalStatus("complete", { COMPLETE: "PAID" })).toBe("PAID");
  });
});

describe("safe mapping rules", () => {
  it("matches employees by code, never name alone", () => {
    const employees = [
      { id: "local-1", employeeCode: "W001", name: "Arjun Mehta" },
    ];
    expect(
      matchExternalEmployee(
        { externalEmployeeId: "ext-1", employeeCode: "w001", name: "Different Name", isActive: true },
        employees,
      )?.id,
    ).toBe("local-1");
    expect(
      matchExternalEmployee(
        { externalEmployeeId: "ext-2", name: "Arjun Mehta", isActive: true },
        employees,
      ),
    ).toBeNull();
  });

  it("matches tables by number or exact normalized name", () => {
    const tables = [{ id: "table-6", number: 6, name: "Table 6" }];
    expect(
      matchExternalTable(
        { externalTableId: "ext-6", tableNumber: 6, name: "Six", isActive: true },
        tables,
      )?.id,
    ).toBe("table-6");
    expect(
      matchExternalTable(
        { externalTableId: "ext-7", name: "table   6", isActive: true },
        tables,
      )?.id,
    ).toBe("table-6");
  });
});

describe("credential and webhook security", () => {
  it("encrypts and decrypts credentials with AES-256-GCM", () => {
    const key = randomBytes(32).toString("base64");
    const encrypted = encryptCredentials({ apiKey: "secret-value" }, key);
    expect(encrypted).not.toContain("secret-value");
    expect(decryptCredentials(encrypted, key)).toEqual({ apiKey: "secret-value" });
  });

  it("redacts secrets from payloads and errors", () => {
    expect(redactSecrets({ authorization: "Bearer abc", nested: { api_key: "123" }, safe: "yes" })).toEqual({
      authorization: "[REDACTED]",
      nested: { api_key: "[REDACTED]" },
      safe: "yes",
    });
    expect(safeIntegrationError(new Error("token=abc123 failed"))).not.toContain("abc123");
  });

  it("verifies mock webhook HMAC signatures and rejects invalid ones", async () => {
    const adapter = createPosAdapter("MOCK", {}, { webhookSecret: "test-secret" });
    const rawBody = JSON.stringify({ eventId: "evt-1", eventType: "BILL_PAID" });
    const signature = createHmac("sha256", "test-secret").update(rawBody).digest("hex");
    await expect(
      adapter.verifyWebhookSignature({ rawBody, headers: new Headers(), signature }),
    ).resolves.toBe(true);
    await expect(
      adapter.verifyWebhookSignature({ rawBody, headers: new Headers(), signature: "bad" }),
    ).resolves.toBe(false);
  });
});

describe("CSV imports", () => {
  it("previews valid rows and preserves row-level errors", () => {
    const preview = previewCsvImport(`bill_number,table_number,bill_total,tip_amount,employee_code,status,paid_at
INV-1,6,2000.00,200.00,W001,PAID,2026-07-22T21:30:00+05:30
INV-2,7,bad,100,R001,PAID,2026-07-22T21:31:00+05:30`);
    expect(preview.validCount).toBe(1);
    expect(preview.errorCount).toBe(1);
    expect(preview.rows[0].bill?.totalPaise).toBe(200_000);
    expect(preview.rows[0].bill?.tipPaise).toBe(20_000);
    expect(preview.rows[1].errors).toContain("Bill total is not a valid rupee amount.");
  });

  it("exports failed rows for correction", () => {
    const preview = previewCsvImport(`bill_number,table_number,bill_total,employee_code,status
INV-2,7,bad,R001,PAID`);
    const output = failedRowsToCsv(preview.rows);
    expect(output).toContain("row_number");
    expect(output).toContain("Bill total is not a valid rupee amount.");
  });
});
