import { describe, expect, it } from "vitest";

import { parseFinanceScenariosResponse } from "./finance-scenarios-contract";

const valid = {
  items: [
    {
      scenarioId: "11111111-1111-4111-8111-111111111111",
      scenarioKind: "BASE",
      name: "Base 2027",
      currency: "USD",
      validFrom: "2027-01-01",
      validTo: "2027-12-31",
      version: 2,
      assumptions: [
        {
          code: "REVENUE_CORE",
          label: "Core revenue",
          amountMinor: "12500000",
          classification: "FORECAST",
        },
      ],
      createdAtUtc: "2026-08-25T22:00:00.000Z",
      updatedAtUtc: "2026-08-25T22:30:00.000Z",
    },
  ],
  semantics: {
    actualSource: "canonical_read_models_only",
    scenarioClassifications: ["BUDGET", "FORECAST"],
    scenarioKinds: ["BASE", "UPSIDE", "DOWNSIDE"],
    implicitFx: false,
    amountRepresentation: "integer_minor_units",
  },
  generatedAtUtc: "2026-08-25T22:30:00.000Z",
};

describe("parseFinanceScenariosResponse", () => {
  it("accepts explicit scenario semantics", () => {
    expect(parseFinanceScenariosResponse(valid)).toEqual(valid);
  });

  it("rejects implicit FX or ambiguous monetary representation", () => {
    expect(
      parseFinanceScenariosResponse({
        ...valid,
        semantics: { ...valid.semantics, implicitFx: true },
      }),
    ).toBeNull();
    expect(
      parseFinanceScenariosResponse({
        ...valid,
        semantics: { ...valid.semantics, amountRepresentation: "decimal_major_units" },
      }),
    ).toBeNull();
  });

  it("rejects malformed assumptions instead of inventing interpretation", () => {
    expect(
      parseFinanceScenariosResponse({
        ...valid,
        items: [
          {
            ...valid.items[0],
            assumptions: [{ ...valid.items[0].assumptions[0], amountMinor: "12.5" }],
          },
        ],
      }),
    ).toBeNull();
    expect(
      parseFinanceScenariosResponse({
        ...valid,
        items: [
          {
            ...valid.items[0],
            assumptions: [{ ...valid.items[0].assumptions[0], classification: "ACTUAL" }],
          },
        ],
      }),
    ).toBeNull();
  });
});
