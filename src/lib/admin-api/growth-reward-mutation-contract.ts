export type GrowthRewardRuleMutationExpectation = {
  kind: "rule-upsert";
  ruleCode: string;
  triggerKind: "Referral" | "Advocacy" | "Gift" | "Campaign";
  rewardKind: "Discount" | "GiftEntitlement" | "RaffleEligibility" | "CharityImpact";
  status: "Draft" | "Active" | "Paused" | "Retired";
  expectedVersion: number;
  maxIssuesPerAccount: number | null;
};

export type GrowthRewardSourceReviewExpectation = {
  kind: "source-review";
  sourceKind: "Referral" | "Advocacy";
  sourceId: string;
  expectedVersion: number;
  decision: "approve" | "reject";
};

export type GrowthRewardMutationExpectation =
  GrowthRewardRuleMutationExpectation | GrowthRewardSourceReviewExpectation;

export type GrowthRewardMutationSuccess = { replayed: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nextVersion(expectedVersion: number): number | null {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return null;
  const value = expectedVersion + 1;
  return Number.isSafeInteger(value) ? value : null;
}

function sameUuid(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

export function parseGrowthRewardMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: GrowthRewardMutationExpectation,
): GrowthRewardMutationSuccess | null {
  const body = record(value);
  if (!body || body.code !== "ok" || typeof body.replayed !== "boolean") return null;

  const version = nextVersion(expected.expectedVersion);
  if (version === null || body.version !== version) return null;

  if (expected.kind === "rule-upsert") {
    const expectedHttpStatus = expected.expectedVersion === 0 ? 201 : 200;
    if (
      httpStatus !== expectedHttpStatus ||
      body.httpStatus !== expectedHttpStatus ||
      typeof body.ruleId !== "string" ||
      !UUID.test(body.ruleId) ||
      body.ruleCode !== expected.ruleCode.trim().toLowerCase() ||
      body.triggerKind !== expected.triggerKind ||
      body.rewardKind !== expected.rewardKind ||
      body.status !== expected.status ||
      body.maxIssuesPerAccount !== expected.maxIssuesPerAccount
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  const targetStatus =
    expected.decision === "reject"
      ? "Rejected"
      : expected.sourceKind === "Referral"
        ? "Qualified"
        : "Verified";
  if (
    httpStatus !== 200 ||
    body.httpStatus !== 200 ||
    body.sourceKind !== expected.sourceKind ||
    !sameUuid(body.sourceId, expected.sourceId) ||
    body.status !== targetStatus
  ) {
    return null;
  }
  return { replayed: body.replayed };
}
