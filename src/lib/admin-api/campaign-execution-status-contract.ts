export const CANONICAL_CAMPAIGN_EXECUTION_STATUSES = [
  "Prepared",
  "ApprovalPending",
  "Scheduled",
  "Sending",
  "Completed",
  "Cancelled",
  "Failed",
] as const;

export type CanonicalCampaignExecutionStatus =
  (typeof CANONICAL_CAMPAIGN_EXECUTION_STATUSES)[number];

// Preserve the existing consumer-facing type surface until the UI owner reconciles
// legacy labels. The wire parser below accepts Core canonical states only.
export type CampaignExecutionStatus = CanonicalCampaignExecutionStatus | "Confirmed" | "Processing";

const CANONICAL_STATUS_SET = new Set<string>(CANONICAL_CAMPAIGN_EXECUTION_STATUSES);

export function isCanonicalCampaignExecutionStatus(
  value: unknown,
): value is CanonicalCampaignExecutionStatus {
  return typeof value === "string" && CANONICAL_STATUS_SET.has(value);
}
