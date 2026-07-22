import type { Metadata } from "next";
import { CsvImporter } from "@/components/manager/csv-importer";

export const metadata: Metadata = { title: "CSV import" };

export default function CsvImportPage() {
  return <CsvImporter />;
}
