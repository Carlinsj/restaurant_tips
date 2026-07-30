import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  readSessionToken,
} from "@/lib/auth/session";
import { hashRateLimitKey } from "@/lib/auth/rate-limit";
import {
  parseJsonRequest,
  readJsonBody,
} from "@/lib/http/request";
import { isPrivateIp } from "@/integrations/pos/security/safe-url";
import { isValidPublicTipAmount, publicTipSchema } from "@/lib/validation/tip";
import { proxy } from "@/proxy";

const TEST_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
let originalAuthSecret: string | undefined;
let originalAppBaseUrl: string | undefined;

beforeEach(() => {
  originalAuthSecret = process.env.AUTH_SECRET;
  originalAppBaseUrl = process.env.APP_BASE_URL;
  process.env.AUTH_SECRET = TEST_SECRET;
  process.env.APP_BASE_URL = "https://tipsathi.example";
});

afterEach(() => {
  if (originalAuthSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalAuthSecret;
  if (originalAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalAppBaseUrl;
});

describe("session integrity", () => {
  it("round-trips a valid signed session", async () => {
    const token = await createSessionToken({
      subjectId: "manager-1",
      restaurantId: "restaurant-1",
      role: "MANAGER",
      name: "Manager",
    });
    await expect(readSessionToken(token)).resolves.toMatchObject({
      subjectId: "manager-1",
      restaurantId: "restaurant-1",
      role: "MANAGER",
    });
  });

  it("rejects a token with the wrong issuer or audience", async () => {
    const token = await new SignJWT({
      restaurantId: "restaurant-1",
      role: "MANAGER",
      name: "Manager",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("manager-1")
      .setIssuer("another-app")
      .setAudience("another-client")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(TEST_SECRET));
    await expect(readSessionToken(token)).resolves.toBeNull();
  });
});

describe("request boundaries", () => {
  it("rejects non-JSON and oversized bodies", async () => {
    await expect(
      readJsonBody(
        new Request("https://tipsathi.example/api/test", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 415 });

    const parsed = await parseJsonRequest(
      new Request("https://tipsathi.example/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaise: 100, idempotencyKey: crypto.randomUUID() }),
      }),
      publicTipSchema,
      8,
    );
    expect(parsed).toEqual({ success: false, status: 413 });
  });

  it("blocks cross-site mutations while exempting signed POS webhooks", () => {
    const blocked = proxy(
      new NextRequest("https://tipsathi.example/api/tips", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Sec-Fetch-Site": "cross-site",
        },
      }),
    );
    expect(blocked.status).toBe(403);

    const webhook = proxy(
      new NextRequest(
        "https://tipsathi.example/api/integrations/pos/integration-1/webhook",
        {
          method: "POST",
          headers: { Origin: "https://provider.example" },
        },
      ),
    );
    expect(webhook.status).toBe(200);
  });

  it("accepts same-origin development mutations on the active local port", () => {
    const response = proxy(
      new NextRequest("http://localhost:3001/api/auth/logout", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3001",
          "Sec-Fetch-Site": "same-origin",
        },
      }),
    );
    expect(response.status).toBe(200);
  });
});

describe("financial and network guardrails", () => {
  it("rejects tampered percentage tips and tips above the bill total", () => {
    expect(
      isValidPublicTipAmount(20_000, { amountPaise: 2_000, percentage: 10 }),
    ).toBe(true);
    expect(
      isValidPublicTipAmount(20_000, { amountPaise: 2_001, percentage: 10 }),
    ).toBe(false);
    expect(
      isValidPublicTipAmount(20_000, { amountPaise: 20_001, percentage: null }),
    ).toBe(false);
  });

  it("blocks private, carrier-grade NAT, mapped IPv4, and multicast addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "100.64.0.1",
      "::ffff:172.16.0.1",
      "fe80::1",
      "ff02::1",
    ]) {
      expect(isPrivateIp(address), address).toBe(true);
    }
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("does not retain raw identifiers in durable rate-limit keys", () => {
    const key = "manager-account:DEMO:manager@example.com";
    const hashed = hashRateLimitKey(key);
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed).not.toContain("manager@example.com");
  });
});
