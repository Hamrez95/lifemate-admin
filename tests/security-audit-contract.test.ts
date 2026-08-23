import { describe, expect, it } from "vitest";

import { parseAuditLogResponse } from "@/src/lib/admin-api/audit-log-contract";

const event = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  actorAccountId: null,
  action: "admin.test",
  resourceType: "admin_member",
  resourceId: null,
  result: "Succeeded",
  reason: null,
  correlationId: "223e4567-e89b-42d3-a456-426614174000",
  requestId: null,
  elevatedAccess: false,
  occurredAtUtc: "2026-08-23T10:00:00.000Z",
};

describe("Audit Explorer response contract", () => {
  it("accepts canonical cursor, filters and freshness", () => {
    expect(
      parseAuditLogResponse({
        events: [event],
        nextCursor: "cursor_abc",
        filters: {
          from: "2026-08-01T00:00:00.000Z",
          to: "2026-08-23T23:59:59.999Z",
        },
        freshness: {
          status: "fresh",
          asOfUtc: "2026-08-23T10:01:00.000Z",
        },
      }),
    ).toEqual({
      events: [event],
      nextCursor: "cursor_abc",
      filters: {
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-23T23:59:59.999Z",
      },
      freshness: {
        status: "fresh",
        asOfUtc: "2026-08-23T10:01:00.000Z",
      },
      supportsServerPaging: true,
    });
  });

  it("keeps old read-only responses non-crashing but marks paging unavailable", () => {
    expect(parseAuditLogResponse({ events: [event] })).toEqual({
      events: [event],
      nextCursor: null,
      filters: { from: null, to: null },
      freshness: null,
      supportsServerPaging: false,
    });
  });

  it("fails closed on partially rolled out pagination contracts", () => {
    expect(parseAuditLogResponse({ events: [event], nextCursor: null })).toBeNull();
    expect(
      parseAuditLogResponse({
        events: [event],
        nextCursor: null,
        filters: { from: null, to: null },
      }),
    ).toBeNull();
  });

  it("rejects invalid cursors and malformed events", () => {
    expect(
      parseAuditLogResponse({
        events: [event],
        nextCursor: 42,
        filters: { from: null, to: null },
        freshness: {
          status: "fresh",
          asOfUtc: "2026-08-23T10:01:00.000Z",
        },
      }),
    ).toBeNull();
    expect(
      parseAuditLogResponse({
        events: [{ ...event, occurredAtUtc: "not-a-date" }],
        nextCursor: null,
        filters: { from: null, to: null },
        freshness: {
          status: "fresh",
          asOfUtc: "2026-08-23T10:01:00.000Z",
        },
      }),
    ).toBeNull();
  });
});
