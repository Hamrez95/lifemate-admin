import { describe, expect, it } from "vitest";

import { parseProductUpdatePolicyMutationSuccess } from "./product-update-policy-mutation-contract";

const expectation = {
  product: "wellmate",
  platform: "android",
  minimumSupportedVersion: "1.4.0",
  recommendedVersion: "1.5.0",
  mode: "Force",
  reasonCode: "Security",
  messageKey: "update.security.required",
  status: "Active",
  effectiveAtUtc: "2026-09-16T00:00:00.000Z",
  expectedVersion: 3,
} as const;

function success(overrides: Record<string, unknown> = {}) {
  return {
    httpStatus: 200,
    code: "ok",
    replayed: false,
    policy: {
      product: "wellmate",
      platform: "android",
      minimumSupportedVersion: "1.4.0",
      recommendedVersion: "1.5.0",
      mode: "Force",
      reasonCode: "Security",
      messageKey: "update.security.required",
      status: "Active",
      policyVersion: 4,
      effectiveAtUtc: "2026-09-16T00:00:00.000Z",
      updatedAtUtc: "2026-09-16T00:01:00.000Z",
      ...overrides,
    },
  };
}

describe("product update policy mutation success contract", () => {
  it("accepts canonical update and replay success", () => {
    expect(parseProductUpdatePolicyMutationSuccess(success(), 200, expectation)).toEqual({
      replayed: false,
      policyVersion: 4,
    });

    expect(
      parseProductUpdatePolicyMutationSuccess({ ...success(), replayed: true }, 200, expectation),
    ).toEqual({ replayed: true, policyVersion: 4 });
  });

  it("accepts canonical create success at version one", () => {
    expect(
      parseProductUpdatePolicyMutationSuccess(success({ policyVersion: 1 }), 200, {
        ...expectation,
        expectedVersion: 0,
      }),
    ).toEqual({ replayed: false, policyVersion: 1 });
  });

  it.each([
    [{ ...success(), httpStatus: 201 }, 200, expectation],
    [{ ...success(), code: "unexpected" }, 200, expectation],
    [{ ...success(), replayed: "false" }, 200, expectation],
    [success({ product: "caremate" }), 200, expectation],
    [success({ platform: "ios" }), 200, expectation],
    [success({ policyVersion: 3 }), 200, expectation],
    [success({ mode: "Soft" }), 200, expectation],
    [success({ reasonCode: "Routine" }), 200, expectation],
    [success({ status: "Disabled" }), 200, expectation],
    [success({ effectiveAtUtc: "2026-09-17T00:00:00.000Z" }), 200, expectation],
    [success({ updatedAtUtc: "not-a-date" }), 200, expectation],
    [success(), 201, expectation],
  ])("rejects malformed or misbound update-policy success %#", (value, status, expected) => {
    expect(parseProductUpdatePolicyMutationSuccess(value, status, expected)).toBeNull();
  });
});
