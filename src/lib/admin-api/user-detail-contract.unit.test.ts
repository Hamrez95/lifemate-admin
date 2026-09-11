import { describe, expect, it } from "vitest";

import { parseUserDetailResponse } from "./user-detail";

function canonicalUserDetail() {
  return {
    account: {
      state: "ready",
      data: {
        id: "8b82f871-baa2-4ee7-9849-ce20882fd67c",
        username: null,
        status: "Active",
        createdAtUtc: "2026-09-11T00:00:00.000Z",
      },
    },
    person: { state: "empty" },
    products: { state: "empty" },
    commerce: {
      state: "ready",
      data: {
        subscriptions: [],
        entitlements: [
          {
            id: "34ad530c-fe45-46bd-a9e7-c86f535c3287",
            featureCode: "wellmate.premium",
            source: "Subscription",
            status: "Active",
            startsAtUtc: "2026-09-11T00:00:00.000Z",
            expiresAtUtc: null,
          },
        ],
      },
    },
    relationships: { state: "empty" },
    adminActivity: { state: "empty" },
    freshness: { status: "fresh", asOfUtc: "2026-09-11T00:00:01.000Z" },
  };
}

describe("User 360 canonical detail contract", () => {
  it("accepts the current Core entitlement projection without an invented version field", () => {
    const payload = canonicalUserDetail();

    expect(parseUserDetailResponse(payload)).toEqual(payload);
  });

  it("still fails closed when a canonical entitlement field is missing", () => {
    const payload = canonicalUserDetail();
    delete (payload.commerce.data.entitlements[0] as Partial<Record<string, unknown>>).featureCode;

    expect(parseUserDetailResponse(payload)).toBeNull();
  });
});
