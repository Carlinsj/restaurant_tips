import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { previewCsvImport } from "@/integrations/pos/providers/csv/parser";
import { safeIntegrationError } from "@/integrations/pos/security/redaction";
import { csvContentSchema } from "@/lib/validation/integration";
import { parseJsonRequest } from "@/lib/http/request";

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = await parseJsonRequest(request, csvContentSchema, 5_500_000);
  if (!parsed.success) return NextResponse.json({ error: "Choose a CSV file smaller than 5 MB." }, { status: parsed.status });
  try {
    return NextResponse.json({ preview: previewCsvImport(parsed.data.csvContent) });
  } catch (error) {
    return NextResponse.json({ error: safeIntegrationError(error) }, { status: 400 });
  }
}
