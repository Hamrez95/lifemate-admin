import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/campaigns/page.tsx", "utf8");
const actions = readFileSync("app/marketing/campaigns/actions.ts", "utf8");
const overview = readFileSync("app/marketing/page.tsx", "utf8");

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
    expect(page).not.toContain("Published:");
    expect(page).toContain("Channel Connections");
    expect(actions).toContain("setMarketingCampaignStatus");
  });

  it("converts operator-selected campaign days through Asia/Tehran boundaries", () => {
    expect(page).toContain("tehranDayBoundaryToUtc");
    expect(page).toContain('tehranDayBoundaryToUtc(from, "start")');
    expect(page).toContain('tehranDayBoundaryToUtc(to, "end")');
    expect(page).not.toContain("T00:00:00+03:30");
    expect(page).not.toContain("T23:59:59+03:30");
  });

  it("is discoverable from the Marketing overview", () => {
    expect(overview).toContain('href="/marketing/campaigns"');
    expect(overview).toContain("مدیریت کمپین‌ها");
  });
});
