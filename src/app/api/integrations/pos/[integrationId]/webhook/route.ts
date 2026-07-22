import { NextResponse } from "next/server";
import { handlePosWebhook } from "@/integrations/pos/webhook-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await context.params;
  const result = await handlePosWebhook({
    integrationId,
    rawBody: await request.text(),
    headers: request.headers,
    clientAddress: request.headers.get("x-forwarded-for") ?? "unknown",
  });
  return NextResponse.json(
    {
      accepted: result.accepted,
      duplicate: result.duplicate,
      processed: result.processed,
      ignored: result.ignored,
      message: result.message,
    },
    { status: result.status },
  );
}
