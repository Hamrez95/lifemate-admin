export type AuditLogEvent = {
  id: string;
  actorAccountId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  reason: string | null;
  correlationId: string;
  requestId: string | null;
  elevatedAccess: boolean;
  occurredAtUtc: string;
};

export type AuditLogResponse = {
  events: AuditLogEvent[];
  nextCursor: string | null;
  filters: {
    from: string | null;
    to: string | null;
  };
  freshness: {
    status: "fresh";
    asOfUtc: string;
  } | null;
  supportsServerPaging: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function validIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function parseEvent(value: unknown): AuditLogEvent | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    !nullableString(value.actorAccountId) ||
    typeof value.action !== "string" ||
    typeof value.resourceType !== "string" ||
    !nullableString(value.resourceId) ||
    typeof value.result !== "string" ||
    !nullableString(value.reason) ||
    typeof value.correlationId !== "string" ||
    !nullableString(value.requestId) ||
    typeof value.elevatedAccess !== "boolean" ||
    typeof value.occurredAtUtc !== "string" ||
    !validIsoDate(value.occurredAtUtc)
  ) {
    return null;
  }

  return {
    id: value.id,
    actorAccountId: value.actorAccountId,
    action: value.action,
    resourceType: value.resourceType,
    resourceId: value.resourceId,
    result: value.result,
    reason: value.reason,
    correlationId: value.correlationId,
    requestId: value.requestId,
    elevatedAccess: value.elevatedAccess,
    occurredAtUtc: value.occurredAtUtc,
  };
}

function parseFilters(value: unknown): AuditLogResponse["filters"] | null {
  if (!isRecord(value) || !nullableString(value.from) || !nullableString(value.to)) {
    return null;
  }
  return { from: value.from, to: value.to };
}

function parseFreshness(value: unknown): AuditLogResponse["freshness"] {
  if (
    !isRecord(value) ||
    value.status !== "fresh" ||
    typeof value.asOfUtc !== "string" ||
    !validIsoDate(value.asOfUtc)
  ) {
    return null;
  }
  return { status: "fresh", asOfUtc: value.asOfUtc };
}

export function parseAuditLogResponse(value: unknown): AuditLogResponse | null {
  if (!isRecord(value) || !Array.isArray(value.events)) return null;
  const events: AuditLogEvent[] = [];
  for (const candidate of value.events) {
    const event = parseEvent(candidate);
    if (!event) return null;
    events.push(event);
  }

  const hasAnyNewContractField =
    "nextCursor" in value || "filters" in value || "freshness" in value;
  if (!hasAnyNewContractField) {
    return {
      events,
      nextCursor: null,
      filters: { from: null, to: null },
      freshness: null,
      supportsServerPaging: false,
    };
  }

  if (!("nextCursor" in value) || !("filters" in value) || !("freshness" in value)) {
    return null;
  }
  if (!nullableString(value.nextCursor)) return null;
  const filters = parseFilters(value.filters);
  const freshness = parseFreshness(value.freshness);
  if (!filters || !freshness) return null;

  return {
    events,
    nextCursor: value.nextCursor,
    filters,
    freshness,
    supportsServerPaging: true,
  };
}
