export type ProductUpdatePolicyMutationExpectation = {
  product: "wellmate" | "caremate";
  platform: "android" | "ios" | "web" | "windows" | "macos" | "linux";
  minimumSupportedVersion: string;
  recommendedVersion: string | null;
  mode: "Soft" | "Force";
  reasonCode: "Routine" | "Critical" | "Security" | "BreakingCompatibility";
  messageKey: string | null;
  status: "Active" | "Disabled";
  effectiveAtUtc: string;
  expectedVersion: number;
};

export type ProductUpdatePolicyMutationSuccess = {
  replayed: boolean;
  policyVersion: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameIso(value: unknown, expected: string): boolean {
  if (typeof value !== "string") return false;
  const actualMs = Date.parse(value);
  const expectedMs = Date.parse(expected);
  return !Number.isNaN(actualMs) && !Number.isNaN(expectedMs) && actualMs === expectedMs;
}

export function parseProductUpdatePolicyMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: ProductUpdatePolicyMutationExpectation,
): ProductUpdatePolicyMutationSuccess | null {
  const body = record(value);
  const policy = record(body?.policy);
  const expectedPolicyVersion = expected.expectedVersion === 0 ? 1 : expected.expectedVersion + 1;

  if (
    !body ||
    !policy ||
    httpStatus !== 200 ||
    body.httpStatus !== 200 ||
    body.code !== "ok" ||
    typeof body.replayed !== "boolean" ||
    policy.product !== expected.product ||
    policy.platform !== expected.platform ||
    policy.minimumSupportedVersion !== expected.minimumSupportedVersion ||
    policy.recommendedVersion !== expected.recommendedVersion ||
    policy.mode !== expected.mode ||
    policy.reasonCode !== expected.reasonCode ||
    policy.messageKey !== expected.messageKey ||
    policy.status !== expected.status ||
    policy.policyVersion !== expectedPolicyVersion ||
    !sameIso(policy.effectiveAtUtc, expected.effectiveAtUtc) ||
    typeof policy.updatedAtUtc !== "string" ||
    Number.isNaN(Date.parse(policy.updatedAtUtc))
  ) {
    return null;
  }

  return { replayed: body.replayed, policyVersion: expectedPolicyVersion };
}
