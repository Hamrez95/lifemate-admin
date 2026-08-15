const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

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

export function localDayBoundaryToUtc(
  day: string,
  timeZone: string,
  boundary: "start" | "end",
): string {
  if (!ISO_DAY_PATTERN.test(day)) throw new RangeError("Expected an ISO calendar day");

  const [year, month, date] = day.split("-").map(Number);
  const localAsUtc =
    boundary === "start"
      ? Date.UTC(year, month - 1, date, 0, 0, 0, 0)
      : Date.UTC(year, month - 1, date, 23, 59, 59, 999);

  let instant = localAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = localAsUtc - timeZoneOffsetMs(instant, timeZone);
    if (next === instant) break;
    instant = next;
  }

  return new Date(instant).toISOString();
}

export function tehranDayBoundaryToUtc(day: string, boundary: "start" | "end"): string {
  return localDayBoundaryToUtc(day, "Asia/Tehran", boundary);
}
