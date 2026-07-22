const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatInr(paise: number): string {
  assertPaise(paise);
  return INR_FORMATTER.format(paise / 100);
}

export function parseRupeesToPaise(value: string): number {
  const normalized = value.trim().replaceAll(",", "");

  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    throw new Error("Enter a valid amount with no more than two decimal places.");
  }

  const [rupees, paise = ""] = normalized.split(".");
  const amount = Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
  assertPaise(amount);
  return amount;
}

export function assertPaise(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error("Money must be represented as a safe integer number of paise.");
  }
}

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
