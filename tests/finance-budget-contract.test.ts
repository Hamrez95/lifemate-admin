import { describe, expect, it } from "vitest";

import { parseFinanceBudgetResponse } from "../src/lib/admin-api/finance-budget-contract";

const readyResponse = {
  state: "ready",
  query: { from: "2026-08-01", to: "2026-08-31", currency: "IRR" },
  currency: "IRR",
  minorUnitExponent: 0,
  availableCurrencies: ["IRR"],
  comparison: {
    totals: {
      revenue: {
        budgetMinor: "1000",
        actualMinor: "1250",
        varianceMinor: "250",
        varianceBasisPoints: "2500",
        favorability: "favorable",
      },
      expense: {
        budgetMinor: "800",
        actualMinor: "750",
        varianceMinor: "-50",
        varianceBasisPoints: "-625",
        favorability: "favorable",
      },
      net: {
        budgetMinor: "200",
        actualMinor: "500",
        varianceMinor: "300",
        varianceBasisPoints: "15000",
        favorability: "favorable",
      },
    },
    categories: [
      {
        kind: "Revenue",
        code: "subscription",
        label: "Subscription",
        budgetMinor: "1000",
        actualMinor: "1250",
        varianceMinor: "250",
        varianceBasisPoints: "2500",
        favorability: "favorable",
      },
      {
        kind: "Expense",
        code: "payroll",
        label: "Payroll",
        budgetMinor: "800",
        actualMinor: "750",
        varianceMinor: "-50",
        varianceBasisPoints: "-625",
        favorability: "favorable",
      },
    ],
  },
  budgetSource: {
    kind: "canonical",
    label: "Approved operating budget",
    code: "operating",
    version: 2,
    approvedAtUtc: "2026-07-25T10:00:00.000Z",
  },
  actualSource: {
    kind: "canonical",
    label: "LifeMate posted finance actual ledger",
    definitionVersion: 1,
  },
  freshness: { status: "fresh", asOfUtc: "2026-07-25T10:00:00.000Z" },
  reason: null,
  generatedAtUtc: "2026-08-17T09:30:00.000Z",
};

describe("ADM-FIN-002 budget vs actual response contract", () => {
  it("accepts canonical budget and actual sources with tested variance semantics", () => {
    const parsed = parseFinanceBudgetResponse(readyResponse);
    expect(parsed?.state).toBe("ready");
    expect(parsed?.comparison?.totals.expense.favorability).toBe("favorable");
    expect(parsed?.comparison?.totals.net.varianceMinor).toBe("300");
  });

  it("rejects mathematically inconsistent variance payloads", () => {
    const invalid = structuredClone(readyResponse);
    invalid.comparison.totals.revenue.varianceMinor = "251";
    expect(parseFinanceBudgetResponse(invalid)).toBeNull();
  });

  it("rejects a fabricated category variance when budget is unavailable", () => {
    const invalid = {
      ...readyResponse,
      comparison: {
        ...readyResponse.comparison,
        categories: [
          ...readyResponse.comparison.categories,
          {
            kind: "Expense",
            code: "incident",
            label: "Incident",
            budgetMinor: null,
            actualMinor: "50",
            varianceMinor: "50",
            varianceBasisPoints: null,
            favorability: "unfavorable",
          },
        ],
      },
    };
    expect(parseFinanceBudgetResponse(invalid)).toBeNull();
  });

  it("accepts truthful unavailable state without manufacturing comparison values", () => {
    const unavailable = {
      ...readyResponse,
      state: "unavailable",
      comparison: null,
      budgetSource: null,
      freshness: { status: "unavailable", asOfUtc: null },
      reason: "No approved canonical budget covers the selected period.",
    };
    expect(parseFinanceBudgetResponse(unavailable)?.state).toBe("unavailable");
  });
});
