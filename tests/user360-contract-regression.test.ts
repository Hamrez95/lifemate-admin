import { describe, expect, it } from "vitest";

import { parseUserDetailResponse } from "@/src/lib/admin-api/user-detail";

const accountId = "123e4567-e89b-42d3-a456-426614174000";

function canonical(overrides: Record<string, unknown> = {}) {
  return {
    account: {
      state: "ready",
      data: {
        id: accountId,
        username: null,
        status: "Active",
        createdAtUtc: "2026-08-30T00:00:00.000Z",
      },
    },
    person: { state: "empty" },
    products: { state: "empty" },
    commerce: { state: "forbidden" },
    relationships: { state: "unavailable" },
    adminActivity: { state: "empty" },
    freshness: { status: "fresh", asOfUtc: "2026-08-30T00:00:00.000Z" },
    ...overrides,
  };
}

describe("User 360 canonical HTTP-200 contract", () => {
  it("accepts privacy-safe partial availability without turning the whole page unavailable", () => {
    const parsed = parseUserDetailResponse(canonical());
    expect(parsed?.account.data?.id).toBe(accountId);
    expect(parsed?.person.state).toBe("empty");
    expect(parsed?.commerce.state).toBe("forbidden");
    expect(parsed?.relationships.state).toBe("unavailable");
  });

  it("accepts a stale canonical snapshot", () => {
    expect(
      parseUserDetailResponse(
        canonical({ freshness: { status: "stale", asOfUtc: "2026-08-29T23:00:00.000Z" } }),
      )?.freshness.status,
    ).toBe("stale");
  });

  it("fails closed on malformed account identity or unknown freshness", () => {
    expect(
      parseUserDetailResponse(
        canonical({ account: { state: "ready", data: { id: "not-a-uuid" } } }),
      ),
    ).toBeNull();
    expect(
      parseUserDetailResponse(
        canonical({ freshness: { status: "unknown", asOfUtc: "2026-08-30T00:00:00.000Z" } }),
      ),
    ).toBeNull();
  });
});
