import type { PosAdapter } from "../../adapter";
import type { ConnectionTestResult, ExternalBill, ExternalEmployee, ExternalOutlet, ExternalTable, NormalizedPosEvent } from "../../types";
import { previewCsvImport, type CsvPreview } from "./parser";

export class CsvPosAdapter implements PosAdapter {
  readonly providerName = "CSV_IMPORT" as const;
  readonly preview: CsvPreview;

  constructor(csvContent: string) {
    this.preview = previewCsvImport(csvContent);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return { ok: this.preview.errorCount === 0, message: `${this.preview.validCount} valid rows and ${this.preview.errorCount} rows with errors.` };
  }
  async getBills(): Promise<ExternalBill[]> {
    return this.preview.rows.flatMap((row) => (row.valid && row.bill ? [row.bill] : []));
  }
  async getEmployees(): Promise<ExternalEmployee[]> {
    const employees = new Map<string, ExternalEmployee>();
    for (const row of this.preview.rows) if (row.valid && row.employee) employees.set(row.employee.externalEmployeeId, row.employee);
    return [...employees.values()];
  }
  async getTables(): Promise<ExternalTable[]> {
    const tables = new Map<string, ExternalTable>();
    for (const row of this.preview.rows) if (row.valid && row.table) tables.set(row.table.externalTableId, row.table);
    return [...tables.values()];
  }
  async getOutlets(): Promise<ExternalOutlet[]> { return []; }
  async handleWebhook(): Promise<NormalizedPosEvent[]> { return []; }
  async verifyWebhookSignature(): Promise<boolean> { return false; }
}
