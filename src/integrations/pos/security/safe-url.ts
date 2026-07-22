import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { PosIntegrationError } from "../adapter";

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) === 6) {
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }
  return true;
}

export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PosIntegrationError("Enter a valid POS base URL.", "UNSAFE_URL");
  }

  const allowedProtocols = process.env.NODE_ENV === "production" ? ["https:"] : ["https:", "http:"];
  if (!allowedProtocols.includes(url.protocol)) {
    throw new PosIntegrationError(
      process.env.NODE_ENV === "production"
        ? "POS connections must use HTTPS."
        : "Only HTTP and HTTPS POS connections are supported.",
      "UNSAFE_URL",
    );
  }
  if (url.username || url.password) {
    throw new PosIntegrationError("Credentials cannot be embedded in a POS URL.", "UNSAFE_URL");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new PosIntegrationError("Private and metadata network addresses are blocked.", "UNSAFE_URL");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new PosIntegrationError("Private and metadata network addresses are blocked.", "UNSAFE_URL");
    }
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new PosIntegrationError("The POS host could not be resolved.", "CONNECTION_FAILED");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new PosIntegrationError("Private and metadata network addresses are blocked.", "UNSAFE_URL");
  }
  return url;
}
