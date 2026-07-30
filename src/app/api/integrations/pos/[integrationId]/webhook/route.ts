import { NextResponse } from "next/server";
import { handlePosWebhook } from "@/integrations/pos/webhook-service";
import { getTrustedClientAddress } from "@/lib/http/client-ip";
import { readTextBody, RequestBodyError } from "@/lib/http/request";

export async function POST(
  request: Request,
  context: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/(?:[a-z0-9.-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
    return NextResponse.json(
      { error: "Content-Type must be application/json." },
      { status: 415 },
    );
  }
  let rawBody: string;
  try {
    rawBody = await readTextBody(request, 1024 * 1024);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "Invalid webhook body." }, { status });
  }
  const result = await handlePosWebhook({
    integrationId,
    rawBody,
    headers: request.headers,
    clientAddress: getTrustedClientAddress(request.headers),
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
