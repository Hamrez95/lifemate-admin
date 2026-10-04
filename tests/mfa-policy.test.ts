import { describe, expect, it } from "vitest";

import { getVerifiedTotpFactors, isLastVerifiedTotpFactor } from "../src/lib/auth/mfa-policy";

describe("workforce TOTP safety policy", () => {
  const factors = [
    { id: "totp-1", status: "verified" },
    { id: "totp-pending", status: "unverified" },
  ];

  it("lists verified factors only", () => {
    expect(getVerifiedTotpFactors(factors)).toEqual([factors[0]]);
  });

  it("protects the sole verified factor, not an unverified factor", () => {
    expect(isLastVerifiedTotpFactor(factors, "totp-1")).toBe(true);
    expect(isLastVerifiedTotpFactor(factors, "totp-pending")).toBe(false);
  });

  it("allows removing one verified factor when a verified backup remains", () => {
    expect(
      isLastVerifiedTotpFactor([...factors, { id: "totp-2", status: "verified" }], "totp-1"),
    ).toBe(false);
  });

  it("fails safely when the current factor snapshot is unavailable", () => {
    expect(getVerifiedTotpFactors(undefined)).toEqual([]);
    expect(isLastVerifiedTotpFactor(undefined, "totp-1")).toBe(false);
  });
});
