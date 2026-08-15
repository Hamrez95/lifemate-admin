import { describe, expect, it } from "vitest";

import type { AnalyticsCatalog } from "../src/lib/admin-api/analytics-catalog";
import {
  buildCohortReport,
  COHORT_SUPPRESSION_THRESHOLD,
  parseCohortQuery,
} from "../src/lib/admin-api/analytics-cohorts";
import type { AnalyticsKpiValuesResponse } from "../src/lib/admin-api/analytics-kpis";

const catalog: AnalyticsCatalog = {
  eventTaxonomyVersion: 1,
  kpiDictionaryVersion: 1,
  generatedAtUtc: "2026-08-15T21:00:00.000Z",
  events: [
    {
      name: "account_created",
      definitionVersion: 1,
      domain: "identity",
      instrumentationState: "partial",
      descriptionFa: "ایجاد حساب",
      source: "identity.accounts lifecycle",
      privacyPolicy: "No contact or health payload.",
    },
    {
      name: "profile_completed",
      definitionVersion: 1,
      domain: "profile",
      instrumentationState: "planned",
      descriptionFa: "تکمیل پروفایل",
      source: "planned producer",
      privacyPolicy: "Completion only.",
    },
    {
      name: "app_opened",
      definitionVersion: 1,
      domain: "product",
      instrumentationState: "planned",
      descriptionFa: "باز شدن اپ",
      source: "planned producer",
      privacyPolicy: "Session telemetry only.",
    },
  ],
  kpis: [],
};

function values(series: Array<{ date: string; value: number }>): AnalyticsKpiValuesResponse {
  return {
    query: { from: "2026-08-01", to: "2026-08-04", product: null },
    generatedAtUtc: "2026-08-15T21:02:00.000Z",
    values: [
      {
        name: "accounts_created",
        definitionVersion: 1,
        state: "partial",
        value: series.reduce((sum, point) => sum + point.value, 0),
        numerator: series.reduce((sum, point) => sum + point.value, 0),
        denominator: null,
        source: "identity.accounts.created_at_utc",
        freshness: { status: "partial", asOfUtc: "2026-08-15T21:01:00.000Z" },
        series,
        reason: "Truthful relational fallback.",
      },
    ],
  };
}

describe("ADM-ANL-002 cohort contract", () => {
  it("keeps zero distinct from unavailable and suppresses only small non-zero cohorts", () => {
    const report = buildCohortReport(
      catalog,
      values([
        { date: "2026-08-01", value: 0 },
        { date: "2026-08-02", value: COHORT_SUPPRESSION_THRESHOLD - 1 },
        { date: "2026-08-03", value: COHORT_SUPPRESSION_THRESHOLD },
      ]),
    );

    expect(report.retention.cohorts[0]).toMatchObject({ size: 0, suppressed: false });
    expect(report.retention.cohorts[0]?.retention[0]).toMatchObject({
      state: "unavailable",
      rate: null,
    });
    expect(report.retention.cohorts[1]).toMatchObject({ size: null, suppressed: true });
    expect(
      report.retention.cohorts[1]?.retention.every((cell) => cell.state === "suppressed"),
    ).toBe(true);
    expect(report.retention.cohorts[2]).toMatchObject({
      size: COHORT_SUPPRESSION_THRESHOLD,
      suppressed: false,
    });
  });

  it("does not invent activation, retention, channel or churn metrics while canonical events are planned", () => {
    const report = buildCohortReport(catalog, values([{ date: "2026-08-01", value: 25 }]));

    expect(report.activation).toMatchObject({ state: "unavailable", rate: null });
    expect(report.retention.state).toBe("unavailable");
    expect(report.retention.cohorts[0]?.retention.map((cell) => cell.rate)).toEqual([
      null,
      null,
      null,
    ]);
    expect(report.channels).toMatchObject({ state: "unavailable", items: [] });
    expect(report.churnReturn).toMatchObject({
      state: "unavailable",
      churnRate: null,
      returnRate: null,
    });
  });

  it("carries canonical definition versions and privacy threshold into the report", () => {
    const report = buildCohortReport(catalog, values([{ date: "2026-08-01", value: 25 }]));

    expect(report.definition).toMatchObject({
      version: 1,
      eventTaxonomyVersion: 1,
      kpiDictionaryVersion: 1,
      timezone: "Asia/Tehran",
      acquisitionEvent: "account_created",
      activationEvent: "profile_completed",
      retentionEvent: "app_opened",
      activationWindowDays: 7,
      suppressionThreshold: 20,
    });
    expect(report.definition.retentionWindows).toEqual([1, 7, 30]);
  });

  it("bounds cohort windows to 180 Tehran calendar days", () => {
    const now = new Date("2026-08-15T21:30:00.000Z");
    const defaults = parseCohortQuery(new URLSearchParams(), now);
    expect(defaults.to).toBe("2026-08-16");

    expect(() =>
      parseCohortQuery(
        new URLSearchParams({ from: "2026-01-01", to: "2026-08-16" }),
        now,
      ),
    ).toThrow(/between 1 and 180 days/);

    expect(
      parseCohortQuery(
        new URLSearchParams({
          from: "2026-08-01",
          to: "2026-08-16",
          product: "wellmate",
        }),
        now,
      ),
    ).toEqual({ from: "2026-08-01", to: "2026-08-16", product: "wellmate" });
  });
});
