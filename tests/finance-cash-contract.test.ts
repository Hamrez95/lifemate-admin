import { describe, expect, it } from "vitest";

import { parseFinanceCashResponse } from "../src/lib/admin-api/finance-cash-contract";

const readyResponse = {
  state: "ready",
  query: {
    from: "2026-07-01",
    to: "2026-07-31",
    currency: "IRR",
    horizonMonths: 2,
  },
  currency: "IRR",
  minorUnitExponent: 0,
  availableCurrencies: ["IRR"],
  actual: {
    state: "ready",
    burn: {
      monthCount: 1,
      revenueMinor: "600",
      grossBurnMinor: "900",
      netBurnMinor: "300",
      averageGrossBurnMinor: "900",
      averageNetBurnMinor: "300",
      series: [{ month: "2026-07", revenueMinor: "600", expenseMinor: "900", netBurnMinor: "300" }],
    },
    source: {
      kind: "canonical",
      label: "LifeMate posted finance actual ledger",
      definitionVersion: 1,
    },
    freshness: { status: "fresh", asOfUtc: "2026-07-31T20:00:00.000Z" },
    reason: null,
  },
  cash: {
    state: "ready",
    balanceMinor: "1200",
    asOfDate: "2026-07-31",
    source: {
      kind: "canonical",
      label: "LifeMate observed management cash balance",
      sourceKind: "treasury_close",
      observedAtUtc: "2026-07-31T20:30:00.000Z",
    },
    freshness: { status: "fresh", asOfUtc: "2026-07-31T20:30:00.000Z" },
    reason: null,
  },
  runway: {
    state: "ready",
    trailingMonthsBasisPoints: "40000",
    formula:
      "observed cash balance / positive average monthly net burn over the selected completed-month actual period",
    reason: null,
  },
  forecast: {
    state: "ready",
    plan: {
      code: "operating_cash",
      version: 3,
      label: "Operating cash plan",
      forecastStartMonth: "2026-08-01",
      requestedHorizonMonths: 2,
      declaredHorizonMonths: 6,
      approvedAtUtc: "2026-07-29T10:00:00.000Z",
      sourceKind: "approved_plan",
    },
    assumptions: [
      { scenario: "Base", code: "base", label: "Base assumption", value: "Approved base case" },
      {
        scenario: "Upside",
        code: "upside",
        label: "Upside assumption",
        value: "Approved upside case",
      },
      {
        scenario: "Downside",
        code: "downside",
        label: "Downside assumption",
        value: "Approved downside case",
      },
    ],
    scenarios: [
      {
        scenario: "Base",
        months: [
          { month: "2026-08", revenueMinor: "700", expenseMinor: "850", netBurnMinor: "150" },
          { month: "2026-09", revenueMinor: "750", expenseMinor: "850", netBurnMinor: "100" },
        ],
        projectedCash: {
          openingCashMinor: "1200",
          endingCashMinor: "950",
          depletionMonth: null,
          runwayState: "beyond_horizon",
          series: [
            { month: "2026-08", projectedEndingCashMinor: "1050" },
            { month: "2026-09", projectedEndingCashMinor: "950" },
          ],
        },
      },
      {
        scenario: "Upside",
        months: [
          { month: "2026-08", revenueMinor: "900", expenseMinor: "800", netBurnMinor: "-100" },
          { month: "2026-09", revenueMinor: "950", expenseMinor: "800", netBurnMinor: "-150" },
        ],
        projectedCash: {
          openingCashMinor: "1200",
          endingCashMinor: "1450",
          depletionMonth: null,
          runwayState: "beyond_horizon",
          series: [
            { month: "2026-08", projectedEndingCashMinor: "1300" },
            { month: "2026-09", projectedEndingCashMinor: "1450" },
          ],
        },
      },
      {
        scenario: "Downside",
        months: [
          { month: "2026-08", revenueMinor: "300", expenseMinor: "1000", netBurnMinor: "700" },
          { month: "2026-09", revenueMinor: "300", expenseMinor: "1000", netBurnMinor: "700" },
        ],
        projectedCash: {
          openingCashMinor: "1200",
          endingCashMinor: "-200",
          depletionMonth: "2026-09",
          runwayState: "depletes_within_horizon",
          series: [
            { month: "2026-08", projectedEndingCashMinor: "500" },
            { month: "2026-09", projectedEndingCashMinor: "-200" },
          ],
        },
      },
    ],
    reason: null,
  },
  reason: null,
  generatedAtUtc: "2026-08-17T10:30:00.000Z",
};

describe("ADM-FIN-003 cash planning response contract", () => {
  it("accepts separated canonical Actual, cash and versioned forecast scenarios", () => {
    const parsed = parseFinanceCashResponse(readyResponse);
    expect(parsed?.state).toBe("ready");
    expect(parsed?.runway?.trailingMonthsBasisPoints).toBe("40000");
    expect(parsed?.forecast?.scenarios).toHaveLength(3);
  });

  it("rejects inconsistent forecast net burn math", () => {
    const invalid = structuredClone(readyResponse);
    invalid.forecast.scenarios[0]!.months[0]!.netBurnMinor = "151";
    expect(parseFinanceCashResponse(invalid)).toBeNull();
  });

  it("rejects a ready forecast that omits a required scenario assumption", () => {
    const invalid = structuredClone(readyResponse);
    invalid.forecast.assumptions = invalid.forecast.assumptions.filter(
      (item) => item.scenario !== "Downside",
    );
    expect(parseFinanceCashResponse(invalid)).toBeNull();
  });

  it("rejects ready Actual burn that does not cover every requested completed month", () => {
    const invalid = structuredClone(readyResponse);
    invalid.query.from = "2026-06-01";
    expect(parseFinanceCashResponse(invalid)).toBeNull();
  });

  it("rejects forecast months that do not begin immediately after the Actual boundary", () => {
    const invalid = structuredClone(readyResponse);
    invalid.forecast.plan.forecastStartMonth = "2026-09-01";
    expect(parseFinanceCashResponse(invalid)).toBeNull();
  });

  it("accepts truthful unavailable data for an explicitly requested currency with no source", () => {
    const unavailable = {
      state: "unavailable",
      query: {
        from: "2026-07-01",
        to: "2026-07-31",
        currency: "IRR",
        horizonMonths: 6,
      },
      currency: "IRR",
      minorUnitExponent: 0,
      availableCurrencies: [],
      actual: {
        state: "unavailable",
        burn: null,
        source: null,
        freshness: { status: "unavailable", asOfUtc: null },
        reason: "No canonical finance actual source exists.",
      },
      cash: {
        state: "unavailable",
        balanceMinor: null,
        asOfDate: null,
        source: null,
        freshness: { status: "unavailable", asOfUtc: null },
        reason: "No canonical cash-balance snapshot is available.",
      },
      runway: {
        state: "unavailable",
        trailingMonthsBasisPoints: null,
        formula: "cash / positive average net burn",
        reason: "Runway inputs are unavailable.",
      },
      forecast: {
        state: "unavailable",
        plan: null,
        assumptions: [],
        scenarios: [],
        reason: "No canonical versioned cash forecast plan is available.",
      },
      reason: "Cash planning is unavailable because required canonical sources are missing.",
      generatedAtUtc: "2026-08-17T10:30:00.000Z",
    };
    expect(parseFinanceCashResponse(unavailable)?.state).toBe("unavailable");
  });
});
