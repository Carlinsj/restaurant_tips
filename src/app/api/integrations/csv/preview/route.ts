import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { previewCsvImport } from "@/integrations/pos/providers/csv/parser";
import { safeIntegrationError } from "@/integrations/pos/security/redaction";
import { csvContentSchema } from "@/lib/validation/integration";

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = csvContentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a CSV file smaller than 5 MB." }, { status: 400 });
  try {
    return NextResponse.json({ preview: previewCsvImport(parsed.data.csvContent) });
  } catch (error) {
    return NextResponse.json({ error: safeIntegrationError(error) }, { status: 400 });
  }
}
