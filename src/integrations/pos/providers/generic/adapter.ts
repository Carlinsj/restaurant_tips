import { createHmac, timingSafeEqual } from "node:crypto";
import { PosIntegrationError, type PosAdapter } from "../../adapter";
import { assertSafeExternalUrl } from "../../security/safe-url";
import type {
  ConnectionTestResult,
  ExternalBill,
  ExternalEmployee,
  ExternalOutlet,
  ExternalTable,
  NormalizedPosEvent,
  PosCredentials,
  PosWebhookInput,
  WebhookVerificationInput,
} from "../../types";
import {
  getNestedValue,
  mapGenericBill,
  mapGenericEmployee,
  mapGenericOutlet,
  mapGenericTable,
  normalizeEventType,
} from "./mapper";
import {
  genericPosSettingsSchema,
  unknownRecordArraySchema,
  unknownRecordSchema,
  type GenericPosSettings,
} from "./schemas";

const MAX_POS_RESPONSE_BYTES = 5 * 1024 * 1024;

async function readBoundedResponse(
  response: Response,
  label: string,
): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_POS_RESPONSE_BYTES
  ) {
    throw new PosIntegrationError(`The ${label} response is too large.`, "INVALID_RESPONSE");
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_POS_RESPONSE_BYTES) {
      await reader.cancel();
      throw new PosIntegrationError(`The ${label} response is too large.`, "INVALID_RESPONSE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export class GenericPosAdapter implements PosAdapter {
  readonly providerName = "GENERIC_API" as const;
  private readonly settings: GenericPosSettings;

  constructor(
    settings: unknown,
    private readonly credentials: PosCredentials,
  ) {
    const parsed = genericPosSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      throw new PosIntegrationError("The generic POS settings are incomplete or invalid.", "INVALID_CONFIGURATION");
    }
    this.settings = parsed.data;
  }

  private authHeaders(credentials = this.credentials): HeadersInit {
    switch (this.settings.authType) {
      case "NONE":
        return {};
      case "API_KEY": {
        const apiKey = credentials.apiKey;
        if (!apiKey || !this.settings.apiKeyHeaderName) {
          throw new PosIntegrationError("An API key and header name are required.", "INVALID_CONFIGURATION");
        }
        return { [this.settings.apiKeyHeaderName]: apiKey };
      }
      case "BEARER_TOKEN": {
        if (!credentials.bearerToken) {
          throw new PosIntegrationError("A bearer token is required.", "INVALID_CONFIGURATION");
        }
        return { Authorization: `Bearer ${credentials.bearerToken}` };
      }
      case "BASIC_AUTH": {
        if (!credentials.username || !credentials.password) {
          throw new PosIntegrationError("A username and password are required.", "INVALID_CONFIGURATION");
        }
        return {
          Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
        };
      }
    }
  }

  private async fetchCollection(
    endpoint: string | undefined,
    label: string,
    credentials = this.credentials,
  ): Promise<Record<string, unknown>[]> {
    if (!endpoint) return [];
    const baseUrl = await assertSafeExternalUrl(this.settings.baseUrl);
    const url = new URL(endpoint, baseUrl);
    if (url.origin !== baseUrl.origin) {
      throw new PosIntegrationError("POS endpoints must remain on the configured host.", "UNSAFE_URL");
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...this.authHeaders(credentials),
        },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(this.settings.timeoutMs),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new PosIntegrationError("The POS provider timed out.", "TIMEOUT");
      }
      throw new PosIntegrationError("Unable to connect to the POS provider.", "CONNECTION_FAILED");
    }

    if (response.status === 401 || response.status === 403) {
      throw new PosIntegrationError("The supplied POS credentials were rejected.", "AUTHENTICATION_FAILED");
    }
    if (!response.ok) {
      throw new PosIntegrationError(`The ${label} endpoint returned HTTP ${response.status}.`, "CONNECTION_FAILED");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/^application\/(?:[a-z0-9.-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
      throw new PosIntegrationError(`The ${label} endpoint did not return JSON.`, "INVALID_RESPONSE");
    }
    let payload: unknown;
    try {
      const bytes = await readBoundedResponse(response, label);
      payload = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ) as unknown;
    } catch (error) {
      if (error instanceof PosIntegrationError) throw error;
      throw new PosIntegrationError(`The ${label} endpoint did not return valid JSON.`, "INVALID_RESPONSE");
    }
    const data = this.settings.responseDataPath
      ? getNestedValue(payload, this.settings.responseDataPath)
      : Array.isArray(payload)
        ? payload
        : getNestedValue(payload, "data");
    const parsed = unknownRecordArraySchema.safeParse(data);
    if (!parsed.success) {
      throw new PosIntegrationError(`The ${label} endpoint returned an invalid response.`, "INVALID_RESPONSE");
    }
    return parsed.data;
  }

  async testConnection(credentials: PosCredentials): Promise<ConnectionTestResult> {
    const startedAt = Date.now();
    const endpoint =
      this.settings.endpoints.outlets ??
      this.settings.endpoints.bills ??
      this.settings.endpoints.employees ??
      this.settings.endpoints.tables;
    if (!endpoint) {
      throw new PosIntegrationError("Configure at least one POS endpoint.", "INVALID_CONFIGURATION");
    }
    const records = await this.fetchCollection(endpoint, "connection test", credentials);
    return {
      ok: true,
      message: "Connected successfully.",
      latencyMs: Date.now() - startedAt,
      details: { recordsVisible: records.length },
    };
  }

  async getBills(): Promise<ExternalBill[]> {
    const records = await this.fetchCollection(this.settings.endpoints.bills, "bills");
    return records.map((record) => mapGenericBill(record, this.settings));
  }

  async getEmployees(): Promise<ExternalEmployee[]> {
    const records = await this.fetchCollection(this.settings.endpoints.employees, "employees");
    return records.map((record) => mapGenericEmployee(record, this.settings));
  }

  async getTables(): Promise<ExternalTable[]> {
    const records = await this.fetchCollection(this.settings.endpoints.tables, "tables");
    return records.map((record) => mapGenericTable(record, this.settings));
  }

  async getOutlets(): Promise<ExternalOutlet[]> {
    const records = await this.fetchCollection(this.settings.endpoints.outlets, "outlets");
    return records.map((record) => mapGenericOutlet(record, this.settings));
  }

  async verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean> {
    const secret = this.credentials.webhookSecret;
    if (!secret || !input.signature) return false;
    const supplied = input.signature.replace(/^sha256=/i, "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
    const expected = createHmac("sha256", secret).update(input.rawBody).digest("hex");
    return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
  }

  async handleWebhook(input: PosWebhookInput): Promise<NormalizedPosEvent[]> {
    if (!this.settings.webhook) {
      throw new PosIntegrationError("Webhook field mappings are not configured.", "INVALID_CONFIGURATION");
    }
    let payload: unknown;
    try {
      payload = JSON.parse(input.rawBody);
    } catch {
      throw new PosIntegrationError("The webhook body is not valid JSON.", "INVALID_RESPONSE");
    }
    const record = unknownRecordSchema.safeParse(payload);
    if (!record.success) {
      throw new PosIntegrationError("The webhook body must be a JSON object.", "INVALID_RESPONSE");
    }
    const config = this.settings.webhook;
    const providerEventId = getNestedValue(record.data, config.eventIdPath);
    const rawEventType = getNestedValue(record.data, config.eventTypePath);
    const rawData = getNestedValue(record.data, config.dataPath);
    if ((typeof providerEventId !== "string" && typeof providerEventId !== "number") || !rawData || typeof rawData !== "object") {
      throw new PosIntegrationError("The webhook is missing its event ID or data object.", "INVALID_RESPONSE");
    }
    const eventType = normalizeEventType(rawEventType, config.eventTypeMappings);
    const data = unknownRecordSchema.parse(rawData);
    const event: NormalizedPosEvent = {
      providerEventId: String(providerEventId),
      eventType,
      rawPayload: record.data,
    };
    if (eventType.startsWith("BILL_") || eventType === "TIP_CONFIRMED" || eventType === "PAYMENT_CONFIRMED") {
      event.bill = mapGenericBill(data, this.settings);
    } else if (eventType === "EMPLOYEE_UPDATED") {
      event.employee = mapGenericEmployee(data, this.settings);
    } else if (eventType === "TABLE_UPDATED") {
      event.table = mapGenericTable(data, this.settings);
    }
    return [event];
  }
}
