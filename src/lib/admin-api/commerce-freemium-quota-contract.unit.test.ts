import { describe, expect, it } from "vitest";

import {
  FREEMIUM_QUOTA_POLICY_KEYS,
  POSTGRES_INTEGER_MAX,
  isFreemiumQuotaPolicyKey,
  validateFreemiumQuotaPolicy,
} from "./commerce-freemium-quota-contract";

describe("commerce freemium quota contract", () => {
  it("recognizes exactly the four canonical Core quota keys", () => {
    for (const policyKey of FREEMIUM_QUOTA_POLICY_KEYS) {
      expect(isFreemiumQuotaPolicyKey(policyKey)).toBe(true);
    }
    expect(isFreemiumQuotaPolicyKey("trial.days")).toBe(false);
    expect(isFreemiumQuotaPolicyKey("free.medications.limit")).toBe(false);
  });

  it.each([0, 1, 3, POSTGRES_INTEGER_MAX])(
    "accepts an active integer quota within PostgreSQL integer range: %s",
    (value) => {
      expect(
        validateFreemiumQuotaPolicy({
          policyKey: "free.medications.max",
          productCode: "wellmate-caremate",
          valueType: "integer",
          status: "Active",
          value,
        }),
      ).toEqual({ kind: "valid", policyKey: "free.medications.max", value });
    },
  );

  it("does not apply special handling to unrelated catalog policies", () => {
    expect(
      validateFreemiumQuotaPolicy({
        policyKey: "trial.days",
        productCode: "period-calendar",
        valueType: "integer",
        status: "Active",
        value: 7,
      }),
    ).toEqual({ kind: "not_freemium_quota" });
  });

  it.each([
    ["period-calendar", "integer", "Active", 1, "wrong_product"],
    ["wellmate-caremate", "string", "Active", 1, "wrong_type"],
    ["wellmate-caremate", "integer", "Retired", 1, "inactive"],
    ["wellmate-caremate", "integer", "Active", -1, "invalid_value"],
    ["wellmate-caremate", "integer", "Active", 1.5, "invalid_value"],
    [
      "wellmate-caremate",
      "integer",
      "Active",
      POSTGRES_INTEGER_MAX + 1,
      "invalid_value",
    ],
  ] as const)(
    "fails closed for invalid canonical quota policy %#",
    (productCode, valueType, status, value, reason) => {
      expect(
        validateFreemiumQuotaPolicy({
          policyKey: "free.owner_caregivers.max",
          productCode,
          valueType,
          status,
          value,
        }),
      ).toEqual({ kind: "invalid", reason });
    },
  );
});
