import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { CsvPosAdapter } from "@/integrations/pos/providers/csv/adapter";
import { safeIntegrationError } from "@/integrations/pos/security/redaction";
import { syncPosIntegration } from "@/integrations/pos/sync-service";
import { csvContentSchema } from "@/lib/validation/integration";
import { parseJsonRequest } from "@/lib/http/request";
import { writeAuditLog } from "@/server/audit";

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = await parseJsonRequest(request, csvContentSchema, 5_500_000);
  if (!parsed.success) return NextResponse.json({ error: "Choose a CSV file smaller than 5 MB." }, { status: parsed.status });
  try {
    const adapter = new CsvPosAdapter(parsed.data.csvContent);
    if (adapter.preview.validCount === 0) {
      return NextResponse.json({ error: "No valid rows are available to import.", preview: adapter.preview }, { status: 422 });
    }
    const prisma = getPrisma();
    let integration = await prisma.posIntegration.findFirst({
      where: { restaurantId: session.restaurantId, provider: "CSV_IMPORT", status: { not: "DISABLED" } },
    });
    if (!integration) {
      integration = await prisma.posIntegration.create({
        data: { restaurantId: session.restaurantId, provider: "CSV_IMPORT", displayName: "CSV imports", status: "CONNECTED", settingsJson: {} },
      });
    }
    const result = await syncPosIntegration({
      restaurantId: session.restaurantId,
      integrationId: integration.id,
      syncType: "CSV_IMPORT",
      actorUserId: session.subjectId,
      adapterOverride: adapter,
    });
    await writeAuditLog(prisma, {
      restaurantId: session.restaurantId,
      actorUserId: session.subjectId,
      action: "POS_CSV_IMPORTED",
      entityType: "PosSyncRun",
      entityId: result.syncRunId,
      newValue: {
        validRows: adapter.preview.validCount,
        invalidRows: adapter.preview.errorCount,
        created: result.created,
        updated: result.updated,
        ignored: result.ignored,
      },
    });
    return NextResponse.json({ result, preview: adapter.preview });
  } catch (error) {
    return NextResponse.json({ error: safeIntegrationError(error) }, { status: 422 });
  }
}
