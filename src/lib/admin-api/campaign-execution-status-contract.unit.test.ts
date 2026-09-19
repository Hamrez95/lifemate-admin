import { describe, expect, it } from "vitest";

import {
  CANONICAL_CAMPAIGN_EXECUTION_STATUSES,
  isCanonicalCampaignExecutionStatus,
} from "./campaign-execution-status-contract";

describe("campaign execution read status contract", () => {
  it("accepts every canonical Core lifecycle status", () => {
    expect(CANONICAL_CAMPAIGN_EXECUTION_STATUSES).toEqual([
      "Prepared",
      "ApprovalPending",
      "Scheduled",
      "Sending",
      "Completed",
      "Cancelled",
      "Failed",
    ]);
    for (const status of CANONICAL_CAMPAIGN_EXECUTION_STATUSES) {
      expect(isCanonicalCampaignExecutionStatus(status)).toBe(true);
    }
  });

  it("rejects legacy/non-canonical statuses on the wire", () => {
    expect(isCanonicalCampaignExecutionStatus("Confirmed")).toBe(false);
    expect(isCanonicalCampaignExecutionStatus("Processing")).toBe(false);
  });

  it("rejects malformed status values", () => {
    expect(isCanonicalCampaignExecutionStatus("approvalpending")).toBe(false);
    expect(isCanonicalCampaignExecutionStatus("Sending ")).toBe(false);
    expect(isCanonicalCampaignExecutionStatus(null)).toBe(false);
    expect(isCanonicalCampaignExecutionStatus(1)).toBe(false);
  });
});
