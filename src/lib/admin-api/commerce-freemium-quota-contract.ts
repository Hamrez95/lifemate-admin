export const FREEMIUM_QUOTA_PRODUCT_CODE = "wellmate-caremate";
export const POSTGRES_INTEGER_MAX = 2_147_483_647;

export const FREEMIUM_QUOTA_POLICY_KEYS = [
  "free.medications.max",
  "free.visits.max",
  "free.owner_caregivers.max",
  "free.caremate_people.max",
] as const;

export type FreemiumQuotaPolicyKey = (typeof FREEMIUM_QUOTA_POLICY_KEYS)[number];

export type FreemiumQuotaPolicyValidation =
  | { kind: "not_freemium_quota" }
  | { kind: "valid"; policyKey: FreemiumQuotaPolicyKey; value: number }
  | {
      kind: "invalid";
      reason: "wrong_product" | "wrong_type" | "inactive" | "invalid_value";
    };

export function isFreemiumQuotaPolicyKey(value: string): value is FreemiumQuotaPolicyKey {
  return (FREEMIUM_QUOTA_POLICY_KEYS as readonly string[]).includes(value);
}

export function validateFreemiumQuotaPolicy(input: {
  policyKey: string;
  productCode: string | null;
  valueType: string | null;
  status: string | null;
  value: unknown;
}): FreemiumQuotaPolicyValidation {
  if (!isFreemiumQuotaPolicyKey(input.policyKey)) return { kind: "not_freemium_quota" };
  if (input.productCode !== FREEMIUM_QUOTA_PRODUCT_CODE) {
    return { kind: "invalid", reason: "wrong_product" };
  }
  if (input.valueType !== "integer") return { kind: "invalid", reason: "wrong_type" };
  if (input.status !== "Active") return { kind: "invalid", reason: "inactive" };
  if (
    !Number.isSafeInteger(input.value) ||
    Number(input.value) < 0 ||
    Number(input.value) > POSTGRES_INTEGER_MAX
  ) {
    return { kind: "invalid", reason: "invalid_value" };
  }
  return {
    kind: "valid",
    policyKey: input.policyKey,
    value: Number(input.value),
  };
}
