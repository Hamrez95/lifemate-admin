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

export function parseAuditLogResponse(value: unknown): AuditLogResponse | null {
  if (!isRecord(value) || !Array.isArray(value.events)) return null;
  const events: AuditLogEvent[] = [];
  for (const candidate of value.events) {
    const event = parseEvent(candidate);
    if (!event) return null;
    events.push(event);
  }
  return { events };
}
