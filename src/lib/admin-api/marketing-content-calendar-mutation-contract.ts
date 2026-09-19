export type MarketingCalendarMutationExpectation =
  | {
      kind: "schedule";
      campaignId: string;
      scheduledLocal: string;
      timezone: string;
    }
  | { kind: "cancel"; executionId: string }
  | { kind: "retry"; executionId: string };

export type MarketingCalendarMutationSuccess = {
  campaignId: string;
  executionId: string;
  publishStatus: "Scheduled" | "Cancelled" | "Queued";
  scheduledForUtc?: string;
  scheduleTimezone?: string;
  retryOfExecutionId?: string;
  providerConnectivity?: "NotVerified";
  replayed: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function exactUuid(value: unknown, expected: string): value is string {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function localSecond(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  return null;
}

function instantMatchesLocal(
  value: unknown,
  scheduledLocal: string,
  timezone: string,
): value is string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return false;
  const expected = localSecond(scheduledLocal);
  if (!expected) return false;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value));
    const map = new Map(parts.map((part) => [part.type, part.value]));
    const actual = `${map.get("year")}-${map.get("month")}-${map.get("day")}T${map.get("hour")}:${map.get("minute")}:${map.get("second")}`;
    return actual === expected;
  } catch {
    return false;
  }
}

export function parseMarketingCalendarMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: MarketingCalendarMutationExpectation,
): MarketingCalendarMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    body.code !== "ok" ||
    !validUuid(body.campaignId) ||
    !validUuid(body.executionId) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  if (expected.kind === "schedule") {
    if (
      httpStatus !== 202 ||
      body.httpStatus !== 202 ||
      !exactUuid(body.campaignId, expected.campaignId) ||
      body.publishStatus !== "Scheduled" ||
      body.scheduleTimezone !== expected.timezone ||
      !instantMatchesLocal(body.scheduledForUtc, expected.scheduledLocal, expected.timezone) ||
      body.providerConnectivity !== "NotVerified"
    ) {
      return null;
    }
    return {
      campaignId: body.campaignId,
      executionId: body.executionId,
      publishStatus: "Scheduled",
      scheduledForUtc: body.scheduledForUtc,
      scheduleTimezone: expected.timezone,
      providerConnectivity: "NotVerified",
      replayed: body.replayed,
    };
  }

  if (expected.kind === "cancel") {
    if (
      httpStatus !== 200 ||
      body.httpStatus !== 200 ||
      !exactUuid(body.executionId, expected.executionId) ||
      body.publishStatus !== "Cancelled"
    ) {
      return null;
    }
    return {
      campaignId: body.campaignId,
      executionId: body.executionId,
      publishStatus: "Cancelled",
      replayed: body.replayed,
    };
  }

  if (
    httpStatus !== 202 ||
    body.httpStatus !== 202 ||
    !exactUuid(body.retryOfExecutionId, expected.executionId) ||
    body.executionId.toLowerCase() === expected.executionId.toLowerCase() ||
    body.publishStatus !== "Queued" ||
    body.providerConnectivity !== "NotVerified"
  ) {
    return null;
  }

  return {
    campaignId: body.campaignId,
    executionId: body.executionId,
    retryOfExecutionId: body.retryOfExecutionId,
    publishStatus: "Queued",
    providerConnectivity: "NotVerified",
    replayed: body.replayed,
  };
}
