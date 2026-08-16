import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/channels/page.tsx", "utf8");
const actions = readFileSync("app/marketing/channels/actions.ts", "utf8");

describe("ADM-MKT-005 channel setup workspace", () => {
  it("splits read and high-risk operator-control permissions", () => {
    expect(page).toContain('admin.permissions.includes("marketing.read")');
    expect(page).toContain('admin.permissions.includes("marketing.social.publish")');
    expect(page).toContain("AdminPageState");
  });

  it("uses audited server actions for enable-disable control", () => {
    expect(page).toContain("setChannelStatusAction");
    expect(page).toContain("channel-status-");
    expect(actions).toContain("setMarketingChannelStatus");
    expect(actions).toContain("IDEMPOTENCY_PATTERN");
  });

  it("renders all truthful setup states and standard empty/unavailable states", () => {
    expect(page).toContain("SetupRequired");
    expect(page).toContain("CredentialAvailable");
    expect(page).toContain("Disabled");
    expect(page).toContain('state="empty"');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain('state="forbidden"');
  });
});
