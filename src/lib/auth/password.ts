import { compare, hash } from "bcryptjs";

const HASH_ROUNDS = 12;

export function hashCredential(value: string): Promise<string> {
  return hash(value, HASH_ROUNDS);
}

export function verifyCredential(
  value: string,
  credentialHash: string,
): Promise<boolean> {
  return compare(value, credentialHash);
}
