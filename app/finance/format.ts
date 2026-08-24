const PERSIAN_DIGITS: Record<string, string> = {
  "0": "۰",
  "1": "۱",
  "2": "۲",
  "3": "۳",
  "4": "۴",
  "5": "۵",
  "6": "۶",
  "7": "۷",
  "8": "۸",
  "9": "۹",
};

export const FINANCE_TIME_ZONE = "Asia/Tehran";

export function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => PERSIAN_DIGITS[digit] ?? digit);
}

export function formatMinorAmount(amountMinor: string, currency: string, exponent: number): string {
  const value = BigInt(amountMinor);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** BigInt(exponent);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;
  const wholeText = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(whole);
  const fractionText =
    exponent > 0 ? `٫${toPersianDigits(fraction.toString().padStart(exponent, "0"))}` : "";
  return `${negative ? "−" : ""}${wholeText}${fractionText} ${currency}`;
}

export function formatBasisPoints(value: string | null): string {
  if (value === null) return "—";
  const basisPoints = BigInt(value);
  const negative = basisPoints < 0n;
  const absolute = negative ? -basisPoints : basisPoints;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  return `${negative ? "−" : "+"}${toPersianDigits(whole.toString())}٫${toPersianDigits(
    fraction.toString().padStart(2, "0"),
  )}٪`;
}

export function formatFinanceTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: FINANCE_TIME_ZONE,
  }).format(new Date(value));
}
