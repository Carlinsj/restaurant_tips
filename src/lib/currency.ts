const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function normalizeCurrencyCode(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!ISO_CURRENCY_PATTERN.test(normalized)) {
    throw new Error("Currency must be a three-letter ISO 4217 code.");
  }
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: normalized });
  } catch {
    throw new Error("Currency must be a supported ISO 4217 code.");
  }
  return normalized;
}

export function currencyMinorUnitDigits(currency: string): number {
  const normalized = normalizeCurrencyCode(currency);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalized,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatCurrency(
  amountMinor: number,
  currency: string,
  locale?: string,
): string {
  assertMinorUnits(amountMinor);
  const normalized = normalizeCurrencyCode(currency);
  const digits = currencyMinorUnitDigits(normalized);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalized,
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(amountMinor / 10 ** digits);
}

export function formatInr(paise: number): string {
  return formatCurrency(paise, "INR", "en-IN");
}

export function parseMajorToMinor(
  value: string,
  minorUnitDigits: number,
): number {
  if (!Number.isInteger(minorUnitDigits) || minorUnitDigits < 0 || minorUnitDigits > 3) {
    throw new Error("Minor-unit precision must be a whole number from zero to three.");
  }
  const normalized = value.trim().replaceAll(",", "");
  const decimals = minorUnitDigits === 0 ? "" : `(?:\\.\\d{0,${minorUnitDigits}})?`;

  if (!new RegExp(`^\\d+${decimals}$`).test(normalized)) {
    throw new Error(
      minorUnitDigits === 0
        ? "Enter a whole-number amount."
        : `Enter a valid amount with no more than ${minorUnitDigits} decimal places.`,
    );
  }

  const [major, fraction = ""] = normalized.split(".");
  const scale = 10 ** minorUnitDigits;
  const amount = Number(major) * scale + Number(fraction.padEnd(minorUnitDigits, "0"));
  assertMinorUnits(amount);
  return amount;
}

export function parseCurrencyToMinor(value: string, currency: string): number {
  return parseMajorToMinor(value, currencyMinorUnitDigits(currency));
}

export function parseRupeesToPaise(value: string): number {
  return parseMajorToMinor(value, 2);
}

export function assertMinorUnits(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error("Money must be represented as a safe integer number of minor currency units.");
  }
}

export const assertPaise = assertMinorUnits;

export function calculatePercentageTip(
  billTotalPaise: number,
  percentage: number,
): number {
  assertPaise(billTotalPaise);

  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Tip percentage must be a whole number from 0 to 100.");
  }

  const numerator = BigInt(billTotalPaise) * BigInt(percentage);
  return Number((numerator + 50n) / 100n);
}
