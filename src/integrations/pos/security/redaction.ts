const SECRET_KEY_PATTERN = /authorization|api[-_]?key|token|secret|password|credential|signature/i;

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : redactSecrets(nested),
      ]),
    );
  }
  return value;
}

export function safeIntegrationError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
      .replace(/(api[-_]?key|token|secret|password)=([^&\s]+)/gi, "$1=[REDACTED]")
      .slice(0, 500);
  }
  return "The POS integration encountered an unexpected error.";
}
