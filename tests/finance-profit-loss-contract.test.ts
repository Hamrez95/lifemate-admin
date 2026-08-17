import { describe, expect, it } from "vitest";

import { parseFinanceProfitLossResponse } from "../src/lib/admin-api/finance-profit-loss-contract";

const readyResponse = {
  state: "ready",
  query: { from: "2026-08-01", to: "2026-08-17", currency: "IRR" },
  currency: "IRR",
  minorUnitExponent: 0,
  availableCurrencies: ["IRR"],
  actual: {
    revenueMinor: "1000",
    expenseMinor: "1250",
    netResultMinor: "-250",
    categories: [
      {
        code: "payroll",
        label: "حقوق و مزایا",
        kind: "Expense",
        amountMinor: "1250",
      },
    ],
    series: [
      {
        month: "2026-08",
        revenueMinor: "1000",
        expenseMinor: "1250",
        netResultMinor: "-250",
      },
    ],
  },
  forecast: {
    state: "unavailable",
    reason: "No canonical forecast source is configured.",
  },
  source: {
    kind: "canonical",
    label: "LifeMate posted finance actual ledger",
    definitionVersion: 1,
  },
  freshness: { status: "fresh", asOfUtc: "2026-08-17T07:00:00.000Z" },
  reason: null,
  generatedAtUtc: "2026-08-17T07:01:00.000Z",
};

describe("ADM-FIN-001 P&L response contract", () => {
  it("accepts signed actual amounts with explicit currency minor-unit semantics", () => {
    const parsed = parseFinanceProfitLossResponse(readyResponse);
    expect(parsed?.state).toBe("ready");
    expect(parsed?.minorUnitExponent).toBe(0);
    expect(parsed?.actual?.netResultMinor).toBe("-250");
    expect(parsed?.forecast.state).toBe("unavailable");
  });

  it("rejects a ready report without actual values", () => {
    expect(parseFinanceProfitLossResponse({ ...readyResponse, actual: null })).toBeNull();
  });

  it("rejects a ready report without a selected canonical currency", () => {
    expect(
      parseFinanceProfitLossResponse({
        ...readyResponse,
        currency: null,
        minorUnitExponent: null,
      }),
    ).toBeNull();
  });

  it("rejects currency amounts without minor-unit semantics", () => {
    expect(
      parseFinanceProfitLossResponse({ ...readyResponse, minorUnitExponent: null }),
    ).toBeNull();
  });

  it("rejects non-ready states that carry actual values", () => {
    expect(parseFinanceProfitLossResponse({ ...readyResponse, state: "unavailable" })).toBeNull();
  });

  it("rejects a currency-required report that does not expose multiple choices", () => {
    expect(
      parseFinanceProfitLossResponse({
        ...readyResponse,
        state: "currency_required",
        query: { ...readyResponse.query, currency: null },
        currency: null,
        minorUnitExponent: null,
        availableCurrencies: ["IRR"],
        actual: null,
      }),
    ).toBeNull();
  });

  it("accepts a truthful unavailable report without manufacturing zero", () => {
    const unavailable = parseFinanceProfitLossResponse({
      ...readyResponse,
      state: "unavailable",
      actual: null,
      freshness: { status: "unavailable", asOfUtc: null },
      reason: "No posted actual ledger entries exist for the selected period.",
    });
    expect(unavailable?.state).toBe("unavailable");
    expect(unavailable?.actual).toBeNull();
  });
});
