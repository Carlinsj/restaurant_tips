import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import type { PosCredentials } from "../types";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const credentialsSchema = z.record(z.string(), z.string());

function resolveEncryptionKey(keyBase64?: string): Buffer {
  const encoded = keyBase64 ?? process.env.POS_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("POS_CREDENTIAL_ENCRYPTION_KEY is required.");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("POS_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptCredentials(
  credentials: PosCredentials,
  keyBase64?: string,
): string {
  const validated = credentialsSchema.parse(credentials);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, resolveEncryptionKey(keyBase64), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(validated), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv, authTag, ciphertext]
    .map((value) => (typeof value === "string" ? value : value.toString("base64url")))
    .join(":");
}

export function decryptCredentials(
  encrypted: string | null,
  keyBase64?: string,
): PosCredentials {
  if (!encrypted) return {};
  const [version, ivEncoded, tagEncoded, ciphertextEncoded, ...extra] = encrypted.split(":");
  if (
    version !== VERSION ||
    !ivEncoded ||
    !tagEncoded ||
    !ciphertextEncoded ||
    extra.length > 0
  ) {
    throw new Error("Encrypted POS credentials use an unsupported format.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    resolveEncryptionKey(keyBase64),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return credentialsSchema.parse(JSON.parse(plaintext));
}
