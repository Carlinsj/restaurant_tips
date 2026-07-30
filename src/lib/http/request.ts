const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9.-]+\+)?json(?:\s*;|$)/i;

export class RequestBodyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415,
  ) {
    super(message);
  }
}

function assertContentLength(request: Request, maxBytes: number): void {
  const value = request.headers.get("content-length");
  if (!value) return;
  const length = Number(value);
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RequestBodyError("The Content-Length header is invalid.", 400);
  }
  if (length > maxBytes) {
    throw new RequestBodyError("The request body is too large.", 413);
  }
}

export async function readTextBody(
  request: Request,
  maxBytes: number,
): Promise<string> {
  assertContentLength(request, maxBytes);
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RequestBodyError("The request body is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new RequestBodyError("The request body is not valid UTF-8.", 400);
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!JSON_CONTENT_TYPE.test(contentType)) {
    throw new RequestBodyError("Content-Type must be application/json.", 415);
  }
  const body = await readTextBody(request, maxBytes);
  if (!body.trim()) throw new RequestBodyError("The request body is empty.", 400);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new RequestBodyError("The request body is not valid JSON.", 400);
  }
}

export async function parseJsonRequest<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = 64 * 1024,
): Promise<
  | { success: true; data: T }
  | { success: false; status: 400 | 413 | 415 }
> {
  try {
    const result = schema.safeParse(await readJsonBody(request, maxBytes));
    return result.success
      ? { success: true, data: result.data }
      : { success: false, status: 400 };
  } catch (error) {
    return {
      success: false,
      status: error instanceof RequestBodyError ? error.status : 400,
    };
  }
}
import type { ZodType } from "zod";
