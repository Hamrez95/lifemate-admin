import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuditLog: vi.fn(),
  getKpiValues: vi.fn(),
  getCommerceOverview: vi.fn(),
  listAdminNotifications: vi.fn(),
  getRelationshipOverview: vi.fn(),
}));

vi.mock("@/src/lib/admin-api/audit-log", () => ({
  getAuditLog: mocks.getAuditLog,
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

    expect(mocks.getAuditLog).not.toHaveBeenCalled();
    expect(mocks.getKpiValues).not.toHaveBeenCalled();
    expect(mocks.getCommerceOverview).not.toHaveBeenCalled();
    expect(mocks.getRelationshipOverview).not.toHaveBeenCalled();
    expect(mocks.listAdminNotifications).not.toHaveBeenCalled();
    expect(result.metrics).toEqual([]);
    expect(result.products).toBeNull();
    expect(result.alerts).toBeNull();
    expect(result.activity).toBeNull();
    expect(result.services).toMatchObject({ state: "not_instrumented", items: [] });
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

  it("uses only the canonical audit API for recent Founder activity", async () => {
    mocks.getAuditLog.mockResolvedValue({
      kind: "ok",
      data: {
        events: [
          {
            id: "evt-1",
            actorAccountId: "account-1",
            action: "role.membership.updated",
            resourceType: "staff_membership",
            resourceId: "member-1",
            result: "success",
            reason: null,
            correlationId: "corr-1",
            requestId: "req-1",
            elevatedAccess: true,
            occurredAtUtc: "2026-08-15T21:29:00.000Z",
          },
        ],
        nextCursor: null,
        filters: { from: null, to: null },
        freshness: { status: "fresh", asOfUtc: "2026-08-15T21:29:30.000Z" },
        supportsServerPaging: true,
      },
    });

    const result = await getFounderOverview(
      ["security.audit.read"],
      new Date("2026-08-15T21:30:00.000Z"),
    );

    expect(mocks.getAuditLog).toHaveBeenCalledWith({ limit: 5 });
    expect(result.activity).toMatchObject({
      state: "ready",
      asOfUtc: "2026-08-15T21:29:30.000Z",
    });
    expect(result.activity?.items[0]).toEqual({
      id: "evt-1",
      action: "role.membership.updated",
      resourceType: "staff_membership",
      result: "success",
      elevatedAccess: true,
      occurredAtUtc: "2026-08-15T21:29:00.000Z",
    });
  });
});
