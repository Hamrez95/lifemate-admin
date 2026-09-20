import { describe, expect, it } from "vitest";

import {
  parseCommerceTrialMutationSuccess,
  parseCommerceTrialPolicy,
  parseCommerceTrialReadEnvelope,
} from "./commerce-trial-policy-contract";

const planId = "11111111-1111-4111-8111-111111111111";
const otherPlanId = "22222222-2222-4222-8222-222222222222";

const policy = {
  planId,
  durationDays: 7,
  eligibilityRule: "NoPriorTrialForProduct",
  status: "Active",
  version: 3,
  createdAtUtc: "2026-09-01T00:00:00.000Z",
  updatedAtUtc: "2026-09-10T00:00:00.000Z",
} as const;

describe("commerce trial policy contract", () => {
  it("accepts the canonical read policy and preserves an explicit missing policy", () => {
    expect(parseCommerceTrialPolicy(policy)).toEqual(policy);
    expect(
      parseCommerceTrialReadEnvelope({
        policy,
        freshness: { status: "fresh", asOfUtc: "2026-09-10T00:00:00.000Z" },
      }),
    ).toEqual({
      policy,
      freshness: { status: "fresh", asOfUtc: "2026-09-10T00:00:00.000Z" },
    });
    expect(
      parseCommerceTrialReadEnvelope({
        policy: null,
        freshness: { status: "fresh", asOfUtc: "2026-09-10T00:00:00.000Z" },
      }),
    ).toEqual({
      policy: null,
      freshness: { status: "fresh", asOfUtc: "2026-09-10T00:00:00.000Z" },
    });
  });

  it("preserves the legacy shape-only mutation parser", () => {
    expect(
      parseCommerceTrialMutationSuccess({
        planId,
        durationDays: 14,
        eligibilityRule: "NoPriorTrialForProduct",
        status: "Disabled",
        version: 4,
        replayed: true,
      }),
    ).toEqual({
      planId,
      durationDays: 14,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Disabled",
      version: 4,
      replayed: true,
    });
  });

  it("binds first policy creation to HTTP 201 and exact requested state", () => {
    const body = {
      planId,
      durationDays: 14,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Active",
      version: 1,
      replayed: false,
    };
    const expected = {
      planId,
      durationDays: 14,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Active",
      expectedVersion: 0,
    } as const;

    expect(parseCommerceTrialMutationSuccess(body, 201, expected)).toEqual(body);
    expect(parseCommerceTrialMutationSuccess(body, 200, expected)).toBeNull();
    expect(
      parseCommerceTrialMutationSuccess({ ...body, planId: otherPlanId }, 201, expected),
    ).toBeNull();
    expect(
      parseCommerceTrialMutationSuccess({ ...body, durationDays: 30 }, 201, expected),
    ).toBeNull();
  });

  it("binds policy update/replay to HTTP 200 and exactly next version", () => {
    const body = {
      planId,
      durationDays: 30,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Disabled",
      version: 4,
      replayed: true,
    };
    const expected = {
      planId,
      durationDays: 30,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Disabled",
      expectedVersion: 3,
    } as const;

    expect(parseCommerceTrialMutationSuccess(body, 200, expected)).toEqual(body);
    expect(parseCommerceTrialMutationSuccess(body, 201, expected)).toBeNull();
    expect(parseCommerceTrialMutationSuccess({ ...body, version: 3 }, 200, expected)).toBeNull();
    expect(
      parseCommerceTrialMutationSuccess({ ...body, status: "Active" }, 200, expected),
    ).toBeNull();
  });

  it.each([
    {},
    { ...policy, planId: "bad" },
    { ...policy, durationDays: 0 },
    { ...policy, durationDays: 366 },
    { ...policy, eligibilityRule: "Everyone" },
    { ...policy, status: "Unknown" },
    { ...policy, version: 0 },
    { ...policy, createdAtUtc: null },
  ])("rejects malformed read policy %#", (value) => {
    expect(parseCommerceTrialPolicy(value)).toBeNull();
  });

  it.each([
    null,
    {},
    { policy, freshness: null },
    {
      policy,
      freshness: { status: "stale", asOfUtc: "2026-09-10T00:00:00.000Z" },
    },
    { policy, freshness: { status: "fresh" } },
    {
      policy: { ...policy, version: 0 },
      freshness: { status: "fresh", asOfUtc: "x" },
    },
  ])("fails closed on malformed read envelope %#", (value) => {
    expect(parseCommerceTrialReadEnvelope(value)).toBeNull();
  });

  it.each([
    {},
    {
      planId,
      durationDays: 7,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Active",
      version: 1,
    },
    {
      planId,
      durationDays: 7,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Active",
      version: 0,
      replayed: false,
    },
    {
      planId,
      durationDays: 7,
      eligibilityRule: "NoPriorTrialForProduct",
      status: "Active",
      version: 1,
      replayed: "false",
    },
  ])("fails closed on malformed mutation success %#", (value) => {
    expect(parseCommerceTrialMutationSuccess(value)).toBeNull();
  });
});
