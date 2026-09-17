import { describe, expect, it } from "vitest";

import { isPrivacyPreferenceMutationSuccess } from "./privacy-preference-mutation-contract";

const EXPECTED = {
  purpose: "marketing_sms",
  policyVersion: "2026.09",
  status: "Active",
} as const;

function success() {
  return {
    httpStatus: 200,
    code: "ok",
    purpose: EXPECTED.purpose,
    policyVersion: EXPECTED.policyVersion,
    status: EXPECTED.status,
    updatedAtUtc: "2026-09-17T18:30:00.000Z",
    replayed: false,
  };
}

describe("privacy preference mutation success contract", () => {
  it("accepts the canonical response bound to the requested purpose/version/status", () => {
    expect(isPrivacyPreferenceMutationSuccess(success(), 200, EXPECTED)).toBe(true);
  });

  it("fails closed on wrong request identity or target state", () => {
    const body = success();
    expect(
      isPrivacyPreferenceMutationSuccess({ ...body, purpose: "analytics" }, 200, EXPECTED),
    ).toBe(false);
    expect(
      isPrivacyPreferenceMutationSuccess({ ...body, policyVersion: "2026.08" }, 200, EXPECTED),
    ).toBe(false);
    expect(isPrivacyPreferenceMutationSuccess({ ...body, status: "Retired" }, 200, EXPECTED)).toBe(
      false,
    );
  });

  it("fails closed on non-canonical HTTP/body envelope or metadata", () => {
    const body = success();
    expect(isPrivacyPreferenceMutationSuccess(body, 201, EXPECTED)).toBe(false);
    expect(isPrivacyPreferenceMutationSuccess({ ...body, httpStatus: 201 }, 200, EXPECTED)).toBe(
      false,
    );
    expect(isPrivacyPreferenceMutationSuccess({ ...body, code: "accepted" }, 200, EXPECTED)).toBe(
      false,
    );
    expect(
      isPrivacyPreferenceMutationSuccess({ ...body, updatedAtUtc: "invalid" }, 200, EXPECTED),
    ).toBe(false);
    expect(isPrivacyPreferenceMutationSuccess({ ...body, replayed: "false" }, 200, EXPECTED)).toBe(
      false,
    );
    expect(isPrivacyPreferenceMutationSuccess(null, 200, EXPECTED)).toBe(false);
  });
});
