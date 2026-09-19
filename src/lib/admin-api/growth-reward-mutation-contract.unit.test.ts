import { describe, expect, it } from "vitest";

import { parseGrowthRewardMutationSuccess } from "./growth-reward-mutation-contract";

const RULE_ID = "123e4567-e89b-42d3-a456-426614174000";
const SOURCE_ID = "123e4567-e89b-42d3-a456-426614174001";
const OTHER_SOURCE_ID = "123e4567-e89b-42d3-a456-426614174002";

describe("growth reward mutation success contract", () => {
  it("binds rule creation to canonical identity, target state and first version", () => {
    const expected = {
      kind: "rule-upsert",
      ruleCode: "referral.welcome",
      triggerKind: "Referral",
      rewardKind: "Discount",
      status: "Active",
      expectedVersion: 0,
      maxIssuesPerAccount: 3,
    } as const;
    const body = {
      httpStatus: 201,
      code: "ok",
      ruleId: RULE_ID,
      ruleCode: "referral.welcome",
      triggerKind: "Referral",
      rewardKind: "Discount",
      status: "Active",
      version: 1,
      maxIssuesPerAccount: 3,
      replayed: false,
    };

    expect(parseGrowthRewardMutationSuccess(body, 201, expected)).toEqual({ replayed: false });
    expect(parseGrowthRewardMutationSuccess({ ...body, version: 2 }, 201, expected)).toBeNull();
    expect(
      parseGrowthRewardMutationSuccess({ ...body, status: "Paused" }, 201, expected),
    ).toBeNull();
    expect(parseGrowthRewardMutationSuccess(body, 200, expected)).toBeNull();
  });

  it("binds rule update to the expected next version and canonical HTTP 200", () => {
    const expected = {
      kind: "rule-upsert",
      ruleCode: "ADVOCACY.SHARE",
      triggerKind: "Advocacy",
      rewardKind: "RaffleEligibility",
      status: "Paused",
      expectedVersion: 4,
      maxIssuesPerAccount: null,
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      ruleId: RULE_ID,
      ruleCode: "advocacy.share",
      triggerKind: "Advocacy",
      rewardKind: "RaffleEligibility",
      status: "Paused",
      version: 5,
      maxIssuesPerAccount: null,
      replayed: true,
    };

    expect(parseGrowthRewardMutationSuccess(body, 200, expected)).toEqual({ replayed: true });
    expect(
      parseGrowthRewardMutationSuccess({ ...body, httpStatus: 201 }, 200, expected),
    ).toBeNull();
    expect(
      parseGrowthRewardMutationSuccess({ ...body, ruleCode: "other" }, 200, expected),
    ).toBeNull();
  });

  it("binds Referral approve review to Qualified and exact source/version", () => {
    const expected = {
      kind: "source-review",
      sourceKind: "Referral",
      sourceId: SOURCE_ID,
      expectedVersion: 2,
      decision: "approve",
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      sourceKind: "Referral",
      sourceId: SOURCE_ID,
      status: "Qualified",
      version: 3,
      replayed: false,
    };

    expect(parseGrowthRewardMutationSuccess(body, 200, expected)).toEqual({ replayed: false });
    expect(
      parseGrowthRewardMutationSuccess({ ...body, sourceId: OTHER_SOURCE_ID }, 200, expected),
    ).toBeNull();
    expect(
      parseGrowthRewardMutationSuccess({ ...body, status: "Verified" }, 200, expected),
    ).toBeNull();
  });

  it("binds Advocacy approve to Verified and rejects to Rejected", () => {
    const approve = {
      kind: "source-review",
      sourceKind: "Advocacy",
      sourceId: SOURCE_ID,
      expectedVersion: 7,
      decision: "approve",
    } as const;
    const base = {
      httpStatus: 200,
      code: "ok",
      sourceKind: "Advocacy",
      sourceId: SOURCE_ID,
      version: 8,
      replayed: true,
    };
    expect(parseGrowthRewardMutationSuccess({ ...base, status: "Verified" }, 200, approve)).toEqual(
      {
        replayed: true,
      },
    );

    const reject = { ...approve, decision: "reject" } as const;
    expect(parseGrowthRewardMutationSuccess({ ...base, status: "Rejected" }, 200, reject)).toEqual({
      replayed: true,
    });
    expect(
      parseGrowthRewardMutationSuccess({ ...base, status: "Verified" }, 200, reject),
    ).toBeNull();
  });

  it("fails closed on malformed envelopes", () => {
    const expected = {
      kind: "source-review",
      sourceKind: "Referral",
      sourceId: SOURCE_ID,
      expectedVersion: 1,
      decision: "reject",
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      sourceKind: "Referral",
      sourceId: SOURCE_ID,
      status: "Rejected",
      version: 2,
      replayed: false,
    };

    expect(
      parseGrowthRewardMutationSuccess({ ...body, code: "accepted" }, 200, expected),
    ).toBeNull();
    expect(
      parseGrowthRewardMutationSuccess({ ...body, replayed: "false" }, 200, expected),
    ).toBeNull();
    expect(parseGrowthRewardMutationSuccess({ ...body, version: 3 }, 200, expected)).toBeNull();
    expect(parseGrowthRewardMutationSuccess(null, 200, expected)).toBeNull();
  });
});
