import { parseRupeesToPaise } from "@/lib/currency";
import type { ExternalBill, ExternalEmployee, ExternalTable } from "../../types";
import { normalizeExternalStatus } from "../generic/mapper";

export type CsvSourceRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type CsvPreviewRow = {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  source: Record<string, string>;
  bill?: ExternalBill;
  employee?: ExternalEmployee;
  table?: ExternalTable;
};

export type CsvPreview = {
  headers: string[];
  rows: CsvPreviewRow[];
  validCount: number;
  errorCount: number;
};

const REQUIRED_COLUMNS = [
  "bill_number",
  "table_number",
  "bill_total",
  "employee_code",
  "status",
] as const;

function tokenizeCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((values) => values.some((value) => value.trim() !== ""));
}

export function parseCsvRows(content: string): {
  headers: string[];
  rows: CsvSourceRow[];
} {
  const tokenized = tokenizeCsv(content.replace(/^\uFEFF/, ""));
  if (tokenized.length === 0) throw new Error("The CSV file is empty.");
  const headers = tokenized[0].map((header) => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) {
    throw new Error("CSV column names must be unique.");
  }
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required columns: ${missing.join(", ")}.`);
  }
  return {
    headers,
    rows: tokenized.slice(1).map((values, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(headers.map((header, column) => [header, values[column]?.trim() ?? ""])),
    })),
  };
}

function positiveTableNumber(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function optionalCsvDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function previewCsvImport(content: string): CsvPreview {
  const { headers, rows } = parseCsvRows(content);
  const previewRows = rows.map<CsvPreviewRow>((row) => {
    const errors: string[] = [];
    const billNumber = row.values.bill_number;
    const employeeCode = row.values.employee_code.toUpperCase();
    const tableNumber = positiveTableNumber(row.values.table_number);
    const status = normalizeExternalStatus(row.values.status);
    if (!billNumber) errors.push("Bill number is required.");
    if (!employeeCode) errors.push("Employee code is required.");
    if (!tableNumber) errors.push("Table number must be a positive integer.");
    if (!row.values.status) errors.push("Status is required.");
    const knownStatus = ["OPEN", "PAID", "CANCELLED", "REFUNDED"].includes(row.values.status.toUpperCase());
    if (!knownStatus) errors.push("Status must be OPEN, PAID, CANCELLED, or REFUNDED.");

    let totalPaise = 0;
    let tipPaise: number | undefined;
    try {
      totalPaise = parseRupeesToPaise(row.values.bill_total);
      if (totalPaise <= 0) errors.push("Bill total must be greater than zero.");
    } catch {
      errors.push("Bill total is not a valid rupee amount.");
    }
    if (row.values.tip_amount) {
      try {
        tipPaise = parseRupeesToPaise(row.values.tip_amount);
      } catch {
        errors.push("Tip amount is not a valid rupee amount.");
      }
    }
    const paidAt = optionalCsvDate(row.values.paid_at);
    if (row.values.paid_at && !paidAt) errors.push("Paid at is not a valid date.");

    if (errors.length > 0 || !tableNumber) {
      return { rowNumber: row.rowNumber, valid: false, errors, source: row.values };
    }

    const externalBillId = row.values.external_bill_id || `csv:${billNumber}`;
    const externalEmployeeId = `csv:employee:${employeeCode}`;
    const externalTableId = `csv:table:${tableNumber}`;
    return {
      rowNumber: row.rowNumber,
      valid: true,
      errors: [],
      source: row.values,
      employee: {
        externalEmployeeId,
        employeeCode,
        name: row.values.employee_name || employeeCode,
        isActive: true,
      },
      table: {
        externalTableId,
        tableNumber,
        name: row.values.table_name || `Table ${tableNumber}`,
        isActive: true,
      },
      bill: {
        externalBillId,
        externalTableId,
        externalEmployeeId,
        externalTipId: tipPaise !== undefined ? `${externalBillId}:tip` : undefined,
        billNumber,
        tableName: row.values.table_name || `Table ${tableNumber}`,
        employeeName: row.values.employee_name || employeeCode,
        subtotalPaise: totalPaise,
        taxPaise: 0,
        totalPaise,
        tipPaise,
        currency: "INR",
        status,
        paidAt,
        rawPayload: row.values,
      },
    };
  });
  return {
    headers,
    rows: previewRows,
    validCount: previewRows.filter((row) => row.valid).length,
    errorCount: previewRows.filter((row) => !row.valid).length,
  };
}

export function failedRowsToCsv(rows: CsvPreviewRow[]): string {
  const failed = rows.filter((row) => !row.valid);
  if (failed.length === 0) return "row_number,errors\n";
  const sourceHeaders = Object.keys(failed[0].source);
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [
    ["row_number", ...sourceHeaders, "errors"].join(","),
    ...failed.map((row) => [
      String(row.rowNumber),
      ...sourceHeaders.map((header) => escape(row.source[header] ?? "")),
      escape(row.errors.join(" ")),
    ].join(",")),
  ].join("\n");
}
