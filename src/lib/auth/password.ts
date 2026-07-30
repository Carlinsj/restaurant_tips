import { compare, hash, truncates } from "bcryptjs";

const HASH_ROUNDS = 12;
const DUMMY_CREDENTIAL_HASH =
  "$2b$12$DQlFkMe9Ew91LKHu9KWZZ.NpTQ/r6F2CTjDGKf3ECWC/RFA.SAoBe";

export function hashCredential(value: string): Promise<string> {
  if (truncates(value)) {
    throw new Error("Credentials must not exceed bcrypt's 72-byte limit.");
  }
  return hash(value, HASH_ROUNDS);
}

export function verifyCredential(
  value: string,
  credentialHash?: string | null,
): Promise<boolean> {
  return compare(value, credentialHash ?? DUMMY_CREDENTIAL_HASH);
}
