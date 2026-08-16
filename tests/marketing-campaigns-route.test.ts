import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/campaigns/page.tsx", "utf8");
const actions = readFileSync("app/marketing/campaigns/actions.ts", "utf8");

describe("ADM-MKT-002 campaign workspace", () => {
  it("is permission-aware and uses shared responsive table states", () => {
    expect(page).toContain('admin.permissions.includes("marketing.read")');
    expect(page).toContain('admin.permissions.includes("marketing.campaign.write")');
    expect(page).toContain("AdminDataTable");
    expect(page).toContain("AdminPageState");
    expect(page).toContain("marketingCampaignStatuses");
  });

  it("exposes explicit human workflow transitions without a Published state", () => {
    expect(page).toContain('Draft: ["Ready", "Cancelled"]');
    expect(page).toContain('Ready: ["Draft", "Active", "Cancelled"]');
    expect(page).toContain('Active: ["Paused", "Completed", "Cancelled"]');
    expect(page).not.toContain('Published:');
    expect(actions).toContain("setMarketingCampaignStatus");
  });
});
