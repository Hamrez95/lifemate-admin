const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_LOCAL_MINUTE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const PERSIAN_LOCALE = "fa-IR-u-ca-persian-nu-latn";
const TEHRAN_TIME_ZONE = "Asia/Tehran";

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const existing = formatterCache.get(timeZone);
  if (existing) return existing;

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
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function parseDisplayDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPersianDate(value: string | Date | null | undefined): string {
  const date = parseDisplayDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(PERSIAN_LOCALE, {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatPersianDateTime(value: string | Date | null | undefined): string {
  const date = parseDisplayDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(PERSIAN_LOCALE, {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function timeZoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(new Date(instantMs));
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
  return localDayBoundaryToUtc(day, TEHRAN_TIME_ZONE, boundary);
}

export function tehranLocalDateTimeToUtc(value: string): string {
  return localDateTimeToUtc(value, TEHRAN_TIME_ZONE);
}
