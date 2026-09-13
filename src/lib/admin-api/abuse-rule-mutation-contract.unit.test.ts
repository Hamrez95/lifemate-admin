import { describe, expect, it } from "vitest";

import { parseAbuseRuleMutationSuccess } from "./abuse-rule-mutation-contract";

const ruleId = "123e4567-e89b-42d3-a456-426614174000";
const otherRuleId = "305927da-bc3f-4d83-a38b-ab3250c39a26";

describe("abuse rule mutation success contract", () => {
  it("accepts canonical create/update success and replay metadata", () => {
    expect(
      parseAbuseRuleMutationSuccess(
        { httpStatus: 200, code: "ok", id: ruleId, version: 1, replayed: false },
        { kind: "upsert", expectedVersion: null },
      ),
    ).toEqual({ id: ruleId, version: 1, replayed: false });

    expect(
      parseAbuseRuleMutationSuccess(
        { httpStatus: 200, code: "ok", id: ruleId, version: 4, replayed: true },
        { kind: "upsert", expectedVersion: 3 },
      ),
    ).toEqual({ id: ruleId, version: 4, replayed: true });
  });

  it("accepts canonical retirement only when identity, version and status match", () => {
    expect(
      parseAbuseRuleMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          id: ruleId,
          version: 6,
          status: "Retired",
          replayed: false,
        },
        { kind: "retire", ruleId, expectedVersion: 5 },
      ),
    ).toEqual({ id: ruleId, version: 6, replayed: false });
  });

  it.each([
    [{ code: "ok", id: ruleId, version: 1, replayed: false }, { kind: "upsert", expectedVersion: null } as const],
    [
      { httpStatus: 200, code: "ok", id: ruleId, version: 2, replayed: false },
      { kind: "upsert", expectedVersion: null } as const,
    ],
    [
      { httpStatus: 200, code: "ok", id: ruleId, version: 4, replayed: "false" },
      { kind: "upsert", expectedVersion: 3 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        id: otherRuleId,
        version: 6,
        status: "Retired",
        replayed: false,
      },
      { kind: "retire", ruleId, expectedVersion: 5 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        id: ruleId,
        version: 6,
        status: "Active",
        replayed: false,
      },
      { kind: "retire", ruleId, expectedVersion: 5 } as const,
    ],
  ])("rejects malformed or misbound success %#", (value, expectation) => {
    expect(parseAbuseRuleMutationSuccess(value, expectation)).toBeNull();
  });
});
