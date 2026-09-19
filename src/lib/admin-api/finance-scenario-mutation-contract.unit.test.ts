import { describe, expect, it } from "vitest";

import { parseFinanceScenarioMutationSuccess } from "./finance-scenario-mutation-contract";

const SCENARIO_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_SCENARIO_ID = "123e4567-e89b-42d3-a456-426614174001";
const UPDATED_AT = "2026-09-19T09:00:00.000Z";

describe("finance scenario mutation success contract", () => {
  it("accepts creation only as HTTP 201 with generated UUID and version 1", () => {
    const body = {
      scenarioId: SCENARIO_ID,
      version: 1,
      updatedAtUtc: UPDATED_AT,
      replayed: false,
    };

    expect(parseFinanceScenarioMutationSuccess(body, 201, { kind: "create" })).toEqual(body);
    expect(parseFinanceScenarioMutationSuccess(body, 200, { kind: "create" })).toBeNull();
    expect(
      parseFinanceScenarioMutationSuccess({ ...body, version: 2 }, 201, { kind: "create" }),
    ).toBeNull();
  });

  it("binds update success to exact scenario identity and next version", () => {
    const expected = {
      kind: "update",
      scenarioId: SCENARIO_ID,
      expectedVersion: 4,
    } as const;
    const body = {
      scenarioId: SCENARIO_ID,
      version: 5,
      updatedAtUtc: UPDATED_AT,
      replayed: true,
    };

    expect(parseFinanceScenarioMutationSuccess(body, 200, expected)).toEqual(body);
    expect(
      parseFinanceScenarioMutationSuccess(
        { ...body, scenarioId: OTHER_SCENARIO_ID },
        200,
        expected,
      ),
    ).toBeNull();
    expect(parseFinanceScenarioMutationSuccess({ ...body, version: 4 }, 200, expected)).toBeNull();
    expect(parseFinanceScenarioMutationSuccess(body, 201, expected)).toBeNull();
  });

  it("fails closed on malformed identifiers, timestamps and replay metadata", () => {
    const expected = {
      kind: "update",
      scenarioId: SCENARIO_ID,
      expectedVersion: 1,
    } as const;
    const body = {
      scenarioId: SCENARIO_ID,
      version: 2,
      updatedAtUtc: UPDATED_AT,
      replayed: false,
    };

    expect(
      parseFinanceScenarioMutationSuccess({ ...body, scenarioId: "invalid" }, 200, expected),
    ).toBeNull();
    expect(
      parseFinanceScenarioMutationSuccess({ ...body, updatedAtUtc: "not-a-date" }, 200, expected),
    ).toBeNull();
    expect(
      parseFinanceScenarioMutationSuccess({ ...body, replayed: "false" }, 200, expected),
    ).toBeNull();
    expect(parseFinanceScenarioMutationSuccess(null, 200, expected)).toBeNull();
  });
});
