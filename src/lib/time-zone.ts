const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_LOCAL_MINUTE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export const DEFAULT_ADMIN_TIME_ZONE = "Asia/Tehran";
export const DEFAULT_ADMIN_LOCALE = "fa-IR-u-ca-persian-nu-latn";

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();
const displayFormatterCache = new Map<string, Intl.DateTimeFormat>();

function offsetFormatterFor(timeZone: string): Intl.DateTimeFormat {
  const existing = offsetFormatterCache.get(timeZone);
  if (existing) return existing;

  // Offset calculations intentionally use the Gregorian calendar. Display
  // formatting is handled separately through the Persian calendar helpers.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  offsetFormatterCache.set(timeZone, formatter);
  return formatter;
}

function displayFormatterFor(
  options: Intl.DateTimeFormatOptions,
  locale = DEFAULT_ADMIN_LOCALE,
  timeZone = DEFAULT_ADMIN_TIME_ZONE,
): Intl.DateTimeFormat {
  const normalizedOptions = { ...options, timeZone };
  const key = `${locale}|${JSON.stringify(normalizedOptions)}`;
  const existing = displayFormatterCache.get(key);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat(locale, normalizedOptions);
  displayFormatterCache.set(key, formatter);
  return formatter;
}

function toDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Expected a valid date value");
  return date;
}

/** Canonical Admin date presentation: Jalali/Persian calendar in Tehran time. */
export function formatAdminDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" },
): string {
  return displayFormatterFor(options).format(toDate(value));
}

/** Canonical Admin date-time presentation: Jalali/Persian calendar in Tehran time. */
export function formatAdminDateTime(value: Date | string | number): string {
  return formatAdminDate(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** Canonical Admin month/day presentation for compact Persian UI. */
export function formatAdminShortDate(value: Date | string | number): string {
  return formatAdminDate(value, { month: "short", day: "numeric" });
}

function timeZoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = offsetFormatterFor(timeZone).formatToParts(new Date(instantMs));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.get("year")),
    Number(values.get("month")) - 1,
    Number(values.get("day")),
    Number(values.get("hour")),
    Number(values.get("minute")),
    Number(values.get("second")),
  );
  const instantWithoutMilliseconds = Math.trunc(instantMs / 1000) * 1000;
  return asUtc - instantWithoutMilliseconds;
}

function localClockToUtc(localAsUtc: number, timeZone: string): string {
  let instant = localAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = localAsUtc - timeZoneOffsetMs(instant, timeZone);
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

export function localDayBoundaryToUtc(
  day: string,
  timeZone: string,
  boundary: "start" | "end",
): string {
  if (!ISO_DAY_PATTERN.test(day)) throw new RangeError("Expected an ISO calendar day");

  const segments = day.split("-");
  const year = Number(segments[0]);
  const month = Number(segments[1]);
  const date = Number(segments[2]);
  const localAsUtc =
    boundary === "start"
      ? Date.UTC(year, month - 1, date, 0, 0, 0, 0)
      : Date.UTC(year, month - 1, date, 23, 59, 59, 999);

  return localClockToUtc(localAsUtc, timeZone);
}

export function localDateTimeToUtc(value: string, timeZone: string): string {
  const match = ISO_LOCAL_MINUTE_PATTERN.exec(value);
  if (!match) throw new RangeError("Expected an ISO local date-time to minute precision");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || date < 1 || date > 31 || hour > 23 || minute > 59) {
    throw new RangeError("Local date-time fields are out of range");
  }
  const localAsUtc = Date.UTC(year, month - 1, date, hour, minute, 0, 0);
  return localClockToUtc(localAsUtc, timeZone);
}

export function tehranDayBoundaryToUtc(day: string, boundary: "start" | "end"): string {
  return localDayBoundaryToUtc(day, DEFAULT_ADMIN_TIME_ZONE, boundary);
}

export function tehranLocalDateTimeToUtc(value: string): string {
  return localDateTimeToUtc(value, DEFAULT_ADMIN_TIME_ZONE);
}
