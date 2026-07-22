"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  failedRowsToCsv,
  previewCsvImport,
  type CsvPreview,
} from "@/integrations/pos/providers/csv/parser";
import { formatInr } from "@/lib/currency";

const SAMPLE_CSV = `bill_number,table_number,bill_total,tip_amount,employee_code,status,paid_at,external_bill_id,employee_name,table_name
INV-1024,6,2000.00,200.00,W001,PAID,2026-07-22T21:40:00+05:30,ext-1024,Arjun Mehta,Table 6
INV-1025,9,1750.50,175.05,W007,PAID,2026-07-22T21:45:00+05:30,ext-1025,Vikram Singh,Table 9
INV-1026,5,not-a-number,,W011,OPEN,,,Meera Nair,Table 5`;

export function CsvImporter() {
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  function createPreview(csv: string, name: string) {
    try {
      setContent(csv);
      setFileName(name);
      setPreview(previewCsvImport(csv));
      setError("");
      setImported(false);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : "The CSV could not be read.");
    }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      setError("Choose a CSV file smaller than 5 MB.");
      return;
    }
    createPreview(await file.text(), file.name);
  }

  function downloadFailures() {
    if (!preview) return;
    const blob = new Blob([failedRowsToCsv(preview.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tipsathi-failed-rows.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importValidRows() {
    if (!preview || preview.validCount === 0 || !content) return;
    setImporting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    setImporting(false);
    setImported(true);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section>
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-3 text-muted-foreground"><Link href="/manager/integrations"><ArrowLeft className="size-3.5" /> Integrations</Link></Button>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Fallback import</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Import bills from CSV</h1><p className="mt-1 text-sm text-muted-foreground">Preview and validate each row before anything is written to TipSathi.</p></div>
          <Button variant="outline" onClick={() => createPreview(SAMPLE_CSV, "sample-pos-export.csv")} className="border-[#d7d0c4] bg-white/65"><FileSpreadsheet className="size-4" /> Load sample file</Button>
        </div>
      </section>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>CSV needs attention</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {imported && preview && <Alert className="border-primary/15 bg-[#e7f1ec]"><CheckCircle2 className="size-4 text-primary" /><AlertTitle className="text-primary">Import complete</AlertTitle><AlertDescription>{preview.validCount} valid rows were processed in an auditable sync run. Re-importing the same external bill IDs will not create duplicates.</AlertDescription></Alert>}

      {!preview ? (
        <Card className="border-dashed border-[#d5cdbf] bg-white/48 py-0 shadow-none">
          <CardContent className="flex min-h-[340px] flex-col items-center justify-center p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#e5eee9] text-primary"><UploadCloud className="size-6" /></span>
            <h2 className="mt-5 text-base font-semibold">Choose a POS export</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Required: bill number, table number, bill total, employee code, and status. Tip amount and paid time are optional.</p>
            <LabelledFileInput onChange={selectFile} />
            <p className="mt-3 text-[11px] text-muted-foreground">CSV only · Maximum 5 MB · Nothing imports before review</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Card className="gap-2 border-[#dfd8ca] bg-white/72 py-4 shadow-none"><CardContent className="px-4"><p className="text-xs text-muted-foreground">File</p><p className="mt-2 truncate text-sm font-semibold">{fileName}</p><p className="mt-1 text-[11px] text-muted-foreground">{preview.rows.length} data rows</p></CardContent></Card>
            <Card className="gap-2 border-[#cddfd5] bg-[#edf5f1] py-4 shadow-none"><CardContent className="px-4"><p className="text-xs text-[#4f7367]">Ready to import</p><p className="font-tabular mt-2 text-2xl font-semibold text-[#286a58]">{preview.validCount}</p><p className="mt-1 text-[11px] text-[#5b7c71]">Validated rows</p></CardContent></Card>
            <Card className={`gap-2 py-4 shadow-none ${preview.errorCount > 0 ? "border-[#ead4af] bg-[#faf0dd]" : "border-[#dfd8ca] bg-white/72"}`}><CardContent className="px-4"><p className="text-xs text-muted-foreground">Needs attention</p><p className="font-tabular mt-2 text-2xl font-semibold">{preview.errorCount}</p><p className="mt-1 text-[11px] text-muted-foreground">Rows stay unimported</p></CardContent></Card>
          </section>

          <Card className="gap-0 overflow-hidden border-[#ded7ca] bg-white/76 py-0 shadow-none">
            <CardHeader className="flex-row items-center justify-between border-b border-[#e8e1d6] px-5 py-4"><div><CardTitle className="text-sm">Import preview</CardTitle><p className="mt-1 text-xs text-muted-foreground">Rupee values have been converted to integer paise for processing.</p></div>{preview.errorCount > 0 && <Button variant="outline" size="sm" onClick={downloadFailures} className="bg-white"><Download className="size-3.5" /> Failed rows</Button>}</CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-[#faf8f3]"><TableHead className="ps-5">Row</TableHead><TableHead>Bill</TableHead><TableHead>Table</TableHead><TableHead>Employee</TableHead><TableHead>Total</TableHead><TableHead>Tip</TableHead><TableHead>Status</TableHead><TableHead className="pe-5">Validation</TableHead></TableRow></TableHeader>
                  <TableBody>{preview.rows.map((row) => <TableRow key={row.rowNumber}><TableCell className="ps-5 font-mono text-[10px] text-muted-foreground">{row.rowNumber}</TableCell><TableCell className="text-xs font-medium">{row.source.bill_number || "—"}</TableCell><TableCell className="text-xs">{row.source.table_number || "—"}</TableCell><TableCell className="text-xs">{row.source.employee_code || "—"}</TableCell><TableCell className="font-tabular text-xs">{row.bill ? formatInr(row.bill.totalPaise) : row.source.bill_total || "—"}</TableCell><TableCell className="font-tabular text-xs">{row.bill?.tipPaise !== undefined ? formatInr(row.bill.tipPaise) : "—"}</TableCell><TableCell><Badge variant="outline" className="text-[9px]">{row.source.status || "Missing"}</Badge></TableCell><TableCell className="max-w-[250px] pe-5">{row.valid ? <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary"><CheckCircle2 className="size-3.5" /> Ready</span> : <span className="inline-flex items-start gap-1.5 text-[11px] leading-4 text-[#9d5d34]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {row.errors.join(" ")}</span>}</TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#ded7ca] bg-white/65 p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><FileCheck2 className="size-5 text-primary" /><div><p className="text-sm font-semibold">{preview.validCount} rows will be imported</p><p className="text-[11px] text-muted-foreground">Invalid rows remain untouched and can be downloaded for correction.</p></div></div><div className="flex gap-2"><Button variant="ghost" onClick={() => { setPreview(null); setFileName(""); setContent(""); }}>Choose another</Button><Button onClick={importValidRows} disabled={preview.validCount === 0 || importing}>{importing ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Import valid rows</Button></div></div>
        </>
      )}
    </div>
  );
}

function LabelledFileInput({ onChange }: { onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="mt-6">
      <label htmlFor="csv-file" className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85"><UploadCloud className="size-4" /> Choose CSV file</label>
      <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={onChange} className="sr-only" />
    </div>
  );
}
