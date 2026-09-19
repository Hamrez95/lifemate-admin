import { describe, expect, it } from "vitest";

import { isMarketingCampaignDetailMutationSuccess } from "./marketing-campaign-detail-mutation-contract";

const CAMPAIGN_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_CAMPAIGN_ID = "123e4567-e89b-42d3-a456-426614174001";
const EXECUTION_ID = "123e4567-e89b-42d3-a456-426614174002";

describe("marketing campaign detail mutation success contract", () => {
  it("binds content update success to exact campaign and canonical revision/state", () => {
    const body = {
      campaignId: CAMPAIGN_ID,
      contentRevision: 4,
      approvalState: "Pending",
      replayed: false,
    };
    const expected = { kind: "content", campaignId: CAMPAIGN_ID } as const;

    expect(isMarketingCampaignDetailMutationSuccess(body, 200, expected)).toBe(true);
    expect(
      isMarketingCampaignDetailMutationSuccess(
        { ...body, campaignId: OTHER_CAMPAIGN_ID },
        200,
        expected,
      ),
    ).toBe(false);
    expect(
      isMarketingCampaignDetailMutationSuccess({ ...body, contentRevision: 0 }, 200, expected),
    ).toBe(false);
    expect(isMarketingCampaignDetailMutationSuccess(body, 202, expected)).toBe(false);
  });

  it("binds approval to the requested Approved/Revoked target", () => {
    const base = {
      campaignId: CAMPAIGN_ID,
      contentRevision: 4,
      replayed: true,
    };

    expect(
      isMarketingCampaignDetailMutationSuccess({ ...base, approvalState: "Approved" }, 200, {
        kind: "approval",
        campaignId: CAMPAIGN_ID,
        approved: true,
      }),
    ).toBe(true);
    expect(
      isMarketingCampaignDetailMutationSuccess({ ...base, approvalState: "Revoked" }, 200, {
        kind: "approval",
        campaignId: CAMPAIGN_ID,
        approved: false,
      }),
    ).toBe(true);
    expect(
      isMarketingCampaignDetailMutationSuccess({ ...base, approvalState: "Pending" }, 200, {
        kind: "approval",
        campaignId: CAMPAIGN_ID,
        approved: true,
      }),
    ).toBe(false);
  });

  it("binds publish request to exact campaign, queued execution and truthful provider state", () => {
    const body = {
      campaignId: CAMPAIGN_ID,
      executionId: EXECUTION_ID,
      publishStatus: "Queued",
      providerConnectivity: "NotVerified",
      replayed: false,
    };
    const expected = { kind: "publish", campaignId: CAMPAIGN_ID } as const;

    expect(isMarketingCampaignDetailMutationSuccess(body, 202, expected)).toBe(true);
    expect(
      isMarketingCampaignDetailMutationSuccess(
        { ...body, publishStatus: "Published" },
        202,
        expected,
      ),
    ).toBe(false);
    expect(
      isMarketingCampaignDetailMutationSuccess(
        { ...body, providerConnectivity: "Verified" },
        202,
        expected,
      ),
    ).toBe(false);
    expect(isMarketingCampaignDetailMutationSuccess(body, 200, expected)).toBe(false);
  });

  it("fails closed on malformed responses", () => {
    expect(
      isMarketingCampaignDetailMutationSuccess(
        {
          campaignId: CAMPAIGN_ID,
          contentRevision: 1,
          approvalState: "Pending",
          replayed: "false",
        },
        200,
        { kind: "content", campaignId: CAMPAIGN_ID },
      ),
    ).toBe(false);
    expect(
      isMarketingCampaignDetailMutationSuccess(null, 200, {
        kind: "content",
        campaignId: CAMPAIGN_ID,
      }),
    ).toBe(false);
  });
});
