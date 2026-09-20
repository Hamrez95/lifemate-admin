export type MarketingCampaignDetailMutationExpectation =
  | { kind: "content"; campaignId: string }
  | { kind: "approval"; campaignId: string; approved: boolean }
  | { kind: "publish"; campaignId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPROVAL_STATES = new Set(["Pending", "Approved", "Revoked"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameUuid(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

function revision(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

export function isMarketingCampaignDetailMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: MarketingCampaignDetailMutationExpectation,
): boolean {
  const body = record(value);
  if (
    !body ||
    !sameUuid(body.campaignId, expected.campaignId) ||
    typeof body.replayed !== "boolean"
  ) {
    return false;
  }

  if (expected.kind === "publish") {
    return (
      httpStatus === 202 &&
      typeof body.executionId === "string" &&
      UUID.test(body.executionId) &&
      body.publishStatus === "Queued" &&
      body.providerConnectivity === "NotVerified"
    );
  }

  if (
    httpStatus !== 200 ||
    !revision(body.contentRevision) ||
    typeof body.approvalState !== "string" ||
    !APPROVAL_STATES.has(body.approvalState)
  ) {
    return false;
  }

  if (expected.kind === "approval") {
    return body.approvalState === (expected.approved ? "Approved" : "Revoked");
  }

  return true;
}
