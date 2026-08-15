import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getKpiValues: vi.fn(),
  getCommerceOverview: vi.fn(),
  listAdminNotifications: vi.fn(),
  getRelationshipOverview: vi.fn(),
}));

vi.mock("@/src/lib/admin-api/analytics-kpis", () => ({
  getKpiValues: mocks.getKpiValues,
}));
vi.mock("@/src/lib/admin-api/commerce-overview", () => ({
  getCommerceOverview: mocks.getCommerceOverview,
}));
vi.mock("@/src/lib/admin-api/notifications", () => ({
  listAdminNotifications: mocks.listAdminNotifications,
}));
vi.mock("@/src/lib/admin-api/relationship-overview", () => ({
  getRelationshipOverview: mocks.getRelationshipOverview,
}));

import { getFounderOverview } from "../src/lib/admin-api/founder-overview";

describe("Founder overview server composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not query domain sources when the admin lacks their permissions", async () => {
    const result = await getFounderOverview(
      ["users.read.basic"],
      new Date("2026-08-15T21:30:00.000Z"),
    );

    expect(mocks.getKpiValues).not.toHaveBeenCalled();
    expect(mocks.getCommerceOverview).not.toHaveBeenCalled();
    expect(mocks.getRelationshipOverview).not.toHaveBeenCalled();
    expect(mocks.listAdminNotifications).not.toHaveBeenCalled();
    expect(result.metrics).toEqual([]);
    expect(result.products).toBeNull();
    expect(result.alerts).toBeNull();
    expect(result.shortcuts).toEqual([
      { label: "کاربران", href: "/users", helper: "دایرکتوری و پروفایل‌های مدیریتی" },
    ]);
  });

  it("keeps source failures isolated and never converts unavailable metrics to zero", async () => {
    mocks.getKpiValues.mockResolvedValue({ kind: "unavailable" });
    mocks.getRelationshipOverview.mockResolvedValue({
      kind: "ok",
      data: {
        summary: [],
        items: [],
        total: 7,
        page: 1,
        pageSize: 5,
        filters: { kind: "relationship", status: "Active" },
        freshness: { status: "fresh", asOfUtc: "2026-08-15T21:29:00.000Z" },
      },
    });
    mocks.getCommerceOverview.mockResolvedValue({
      kind: "ok",
      data: {
        summary: {
          subscriptions: { active: 3, trial: 0, pastDue: 1, cancelled: 0, expired: 0, refunded: 0 },
          entitlements: { active: 4, expired: 0, revoked: 0 },
        },
        products: [],
        planDistribution: [],
        entitlementCoverage: [],
        renewalHighlights: [],
        entitlementExpiryHighlights: [],
        subscriptions: { items: [], total: 3 },
        page: 1,
        pageSize: 5,
        filters: { product: null, status: null },
        freshness: { status: "fresh", asOfUtc: "2026-08-15T21:29:30.000Z" },
      },
    });
    mocks.listAdminNotifications.mockResolvedValue({
      kind: "ok",
      data: {
        items: [],
        page: 1,
        pageSize: 6,
        knownTotal: 0,
        total: null,
        knownUnreadCount: 0,
        unreadCount: null,
        completeness: "partial",
        sourceStates: [
          {
            source: "product",
            state: "not_instrumented",
            total: null,
            unreadCount: null,
            asOfUtc: "2026-08-15T21:29:45.000Z",
            reasonCode: "canonical_source_not_instrumented",
          },
        ],
        asOfUtc: "2026-08-15T21:29:45.000Z",
      },
    });

    const result = await getFounderOverview(
      ["analytics.read", "relationships.read", "commerce.read"],
      new Date("2026-08-15T21:30:00.000Z"),
    );

    const mau = result.metrics.find((item) => item.key === "monthly-active-accounts");
    const relationship = result.metrics.find((item) => item.key === "active-relationships");
    const subscriptions = result.metrics.find((item) => item.key === "active-subscriptions");

    expect(mau).toMatchObject({ state: "unavailable", value: null });
    expect(relationship).toMatchObject({ state: "ready", value: 7 });
    expect(subscriptions).toMatchObject({ state: "ready", value: 3 });
    expect(result.alerts?.sources[0]).toMatchObject({
      source: "product",
      state: "not_instrumented",
      unreadCount: null,
    });
  });
});
