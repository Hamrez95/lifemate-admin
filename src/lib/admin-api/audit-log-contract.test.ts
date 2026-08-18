import { describe, expect, it } from "vitest";

import { parseAuditLogResponse } from "./audit-log-contract";

const event = {
  id: "evt-1",
  actorAccountId: "2f68f92d-331b-49d1-ac31-cf52ae53ff51",
  action: "admin.user.suspend",
  resourceType: "account",
  resourceId: "subject-1",
  result: "Succeeded",
  reason: "Support escalation",
  correlationId: "7c510a1f-2035-4c18-bf29-95d0d84b43c2",
  requestId: "request-1",
  elevatedAccess: false,
  occurredAtUtc: "2026-08-18T10:00:00.000Z",
};

describe("parseAuditLogResponse", () => {
  it("accepts the canonical bounded audit shape", () => {
    expect(parseAuditLogResponse({ events: [event] })).toEqual({ events: [event] });
  });

  it("accepts nullable identifiers without inventing values", () => {
    expect(
      parseAuditLogResponse({
        events: [
          {
            ...event,
            actorAccountId: null,
            resourceId: null,
            reason: null,
            requestId: null,
          },
        ],
      }),
    ).not.toBeNull();
  });

  it("rejects malformed or non-date event payloads fail-closed", () => {
    expect(parseAuditLogResponse({ events: [{ ...event, elevatedAccess: "false" }] })).toBeNull();
    expect(
      parseAuditLogResponse({ events: [{ ...event, occurredAtUtc: "not-a-date" }] }),
    ).toBeNull();
    expect(parseAuditLogResponse({ events: {} })).toBeNull();
  });
});
