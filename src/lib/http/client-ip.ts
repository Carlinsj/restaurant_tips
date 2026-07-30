import { isIP } from "node:net";

function firstValidAddress(value: string | null): string | null {
  if (!value) return null;
  for (const candidate of value.split(",")) {
    const address = candidate.trim();
    if (isIP(address)) return address;
  }
  return null;
}

export function getTrustedClientAddress(headers: Headers): string {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "untrusted-proxy";
  return (
    firstValidAddress(headers.get("x-vercel-forwarded-for")) ??
    firstValidAddress(headers.get("x-forwarded-for")) ??
    firstValidAddress(headers.get("x-real-ip")) ??
    "unknown"
  );
}
