import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getKpiValues: vi.fn(),
  getMarketingAttribution: vi.fn(),
}));

vi.mock("../src/lib/admin-api/analytics-kpis", () => ({
  getKpiValues: mocks.getKpiValues,
}));

vi.mock("../src/lib/admin-api/marketing-attribution", () => ({
  getMarketingAttribution: mocks.getMarketingAttribution,
}));

import {
  getMarketingOverview,
  parseMarketingOverviewQuery,
} from "../src/lib/admin-api/marketing-overview";

describe("ADM-MKT-001 Marketing Overview contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMarketingAttribution.mockResolvedValue({ kind: "unavailable" });
  });

  it("does not query Analytics when the marketing admin lacks analytics.read", async () => {
    const result = await getMarketingOverview(
      new URLSearchParams({ from: "2026-08-01", to: "2026-08-16" }),
      ["marketing.read"],
      new Date("2026-08-15T21:30:00.000Z"),
    );

    expect(mocks.getKpiValues).not.toHaveBeenCalled();
    expect(mocks.getMarketingAttribution).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.data.acquisition).toMatchObject({
      state: "unavailable",
      total: null,
      series: [],
    });
    expect(result.data.attribution).toBeNull();
    expect(result.data.attributionReason).toMatch(/هیچ مقدار جایگزین یا تخمینی/);
  });

  it("uses only the canonical accounts_created KPI when analytics.read is available", async () => {
    mocks.getKpiValues.mockResolvedValue({
      kind: "ok",
      data: {
        query: { from: "2026-08-01", to: "2026-08-16", product: null },
        generatedAtUtc: "2026-08-15T21:29:00.000Z",
        values: [
          {
            name: "accounts_created",
            definitionVersion: 1,
            state: "partial",
            value: 42,
            numerator: 42,
            denominator: null,
            source: "identity.accounts.created_at_utc",
            freshness: { status: "partial", asOfUtc: "2026-08-15T21:28:00.000Z" },
            series: [
              { date: "2026-08-15", value: 20 },
              { date: "2026-08-16", value: 22 },
            ],
            reason: "Truthful relational fallback.",
          },
        ],
      },
    });

    const result = await getMarketingOverview(
      new URLSearchParams({ from: "2026-08-01", to: "2026-08-16" }),
      ["marketing.read", "analytics.read"],
      new Date("2026-08-15T21:30:00.000Z"),
    );

    expect(mocks.getKpiValues).toHaveBeenCalledTimes(1);
    expect(mocks.getMarketingAttribution).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.data.acquisition).toMatchObject({
      state: "partial",
      total: 42,
      source: "identity.accounts.created_at_utc",
    });
    expect(result.data.acquisition.series).toHaveLength(2);
    expect(result.data.attribution).toBeNull();
    expect(result.data.attributionReason).not.toBeNull();
  });

  it("bounds marketing filters to 180 Tehran calendar days", () => {
    const now = new Date("2026-08-15T21:30:00.000Z");
    expect(parseMarketingOverviewQuery(new URLSearchParams(), now).to).toBe("2026-08-16");
    expect(() =>
      parseMarketingOverviewQuery(
        new URLSearchParams({ from: "2026-01-01", to: "2026-08-16" }),
        now,
      ),
    ).toThrow(/between 1 and 180 days/);
  });
});
