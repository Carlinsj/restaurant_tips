import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  const integration = await getPrisma().posIntegration.findFirst({ where: { id, restaurantId: session.restaurantId } });
  if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  const syncRuns = await getPrisma().posSyncRun.findMany({ where: { posIntegrationId: id, restaurantId: session.restaurantId }, orderBy: { startedAt: "desc" }, take: 50 });
  return NextResponse.json({ syncRuns });
}
