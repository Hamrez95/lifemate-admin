import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/campaigns/[campaignId]/page.tsx", "utf8");
const actions = readFileSync("app/marketing/campaigns/[campaignId]/actions.ts", "utf8");
const listPage = readFileSync("app/marketing/campaigns/page.tsx", "utf8");

describe("ADM-MKT-003 campaign detail workspace", () => {
  it("splits read, edit and high-risk publish permissions", () => {
    expect(page).toContain('admin.permissions.includes("marketing.read")');
    expect(page).toContain('admin.permissions.includes("marketing.campaign.write")');
    expect(page).toContain('admin.permissions.includes("marketing.social.publish")');
    expect(page).toContain("AdminPageState");
  });

  it("requires a human approval gate before publish", () => {
    expect(page).toContain("Human approval gate");
    expect(page).toContain("approvedRevision === content.contentRevision");
    expect(page).toContain("setCampaignApprovalAction");
    expect(actions).toContain("setMarketingCampaignApproval");
  });

  it("uses explicit idempotent server actions for content, approval and publish", () => {
    expect(page).toContain("campaign-content-");
    expect(page).toContain("campaign-approval-");
    expect(page).toContain("campaign-publish-");
    expect(actions).toContain("IDEMPOTENCY_PATTERN");
    expect(actions).toContain("updateMarketingCampaignContent");
    expect(actions).toContain("requestMarketingCampaignPublish");
  });

  it("surfaces truthful unavailable and provider-failure states", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toContain('state="forbidden"');
    expect(page).toContain("OutcomeUnknown");
    expect(page).toContain("Failure code");
  });

  it("makes campaign detail discoverable from the list", () => {
    expect(listPage).toContain("href={`/marketing/campaigns/${row.id}`}");
  });
});
