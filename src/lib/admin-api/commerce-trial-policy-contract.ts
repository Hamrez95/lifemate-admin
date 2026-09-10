export type CommerceTrialPolicy = {
  planId: string;
  durationDays: number;
  eligibilityRule: "NoPriorTrialForProduct";
  status: "Active" | "Disabled";
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CommerceTrialPolicyMutationSuccess = {
  planId: string;
  durationDays: number;
  eligibilityRule: "NoPriorTrialForProduct";
  status: "Active" | "Disabled";
  version: number;
  replayed: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function integer(value: unknown, minimum: number): number | null {
  return Number.isInteger(value) && Number(value) >= minimum ? Number(value) : null;
}

function status(value: unknown): CommerceTrialPolicy["status"] | null {
  return value === "Active" || value === "Disabled" ? value : null;
}

function eligibility(value: unknown): CommerceTrialPolicy["eligibilityRule"] | null {
  return value === "NoPriorTrialForProduct" ? value : null;
}

export function parseCommerceTrialPolicy(value: unknown): CommerceTrialPolicy | null {
  const row = record(value);
  if (!row) return null;
  const durationDays = integer(row.durationDays, 1);
  const version = integer(row.version, 1);
  const parsedStatus = status(row.status);
  const parsedEligibility = eligibility(row.eligibilityRule);
  if (
    typeof row.planId !== "string" ||
    !UUID.test(row.planId) ||
    durationDays === null ||
    durationDays > 365 ||
    !parsedEligibility ||
    !parsedStatus ||
    version === null ||
    typeof row.createdAtUtc !== "string" ||
    typeof row.updatedAtUtc !== "string"
  ) {
    return null;
  }
  return {
    planId: row.planId,
    durationDays,
    eligibilityRule: parsedEligibility,
    status: parsedStatus,
    version,
    createdAtUtc: row.createdAtUtc,
    updatedAtUtc: row.updatedAtUtc,
  };
}

export function parseCommerceTrialMutationSuccess(
  value: unknown,
): CommerceTrialPolicyMutationSuccess | null {
  const row = record(value);
  if (!row) return null;
  const durationDays = integer(row.durationDays, 1);
  const version = integer(row.version, 1);
  const parsedStatus = status(row.status);
  const parsedEligibility = eligibility(row.eligibilityRule);
  if (
    typeof row.planId !== "string" ||
    !UUID.test(row.planId) ||
    durationDays === null ||
    durationDays > 365 ||
    !parsedEligibility ||
    !parsedStatus ||
    version === null ||
    typeof row.replayed !== "boolean"
  ) {
    return null;
  }
  return {
    planId: row.planId,
    durationDays,
    eligibilityRule: parsedEligibility,
    status: parsedStatus,
    version,
    replayed: row.replayed,
  };
}

export function parseCommerceTrialReadEnvelope(value: unknown): {
  policy: CommerceTrialPolicy | null;
  freshness: { status: "fresh"; asOfUtc: string };
} | null {
  const row = record(value);
  if (!row) return null;
  const freshness = record(row.freshness);
  if (!freshness || freshness.status !== "fresh" || typeof freshness.asOfUtc !== "string") {
    return null;
  }
  if (row.policy === null) {
    return { policy: null, freshness: { status: "fresh", asOfUtc: freshness.asOfUtc } };
  }
  const policy = parseCommerceTrialPolicy(row.policy);
  return policy ? { policy, freshness: { status: "fresh", asOfUtc: freshness.asOfUtc } } : null;
}
