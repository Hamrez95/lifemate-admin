import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/admin-api/marketing-campaign-detail.ts", "utf8");
const page = readFileSync("app/marketing/campaigns/[campaignId]/page.tsx", "utf8");
const actions = readFileSync("app/marketing/campaigns/[campaignId]/actions.ts", "utf8");

describe("ADM-MKT-003 campaign detail security contract", () => {
  it("uses only the server Admin API with bounded no-store requests", () => {
    expect(client).toContain('import "server-only"');
    expect(client).toContain("createServerSupabaseClient");
    expect(client).toContain("/api/v1/marketing/campaigns/");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toMatch(/service[_-]?role|DATABASE_URL|SUPABASE_DB_URL/i);
  });

  it("never accepts or renders raw provider credentials", () => {
    expect(page).toContain("Credential موجود ≠ Connected");
    expect(page).toContain("NotVerified");
    expect(page).not.toMatch(/name=["'](?:accessToken|refreshToken|secret|credential|apiKey)["']/i);
    expect(client).not.toMatch(
      /accessToken|refreshToken|decrypted_secret|credentialSecretName|secretValue/,
    );
    expect(actions).not.toMatch(/accessToken|refreshToken|secretValue|apiKey/);
  });

  it("keeps missing funnel instrumentation unavailable instead of fabricating zero", () => {
    expect(page).toContain("عمداً صفر نمایش داده نمی‌شوند");
    expect(page).toContain("Instrumentation");
    expect(client).toContain('availability: "Available" | "Unavailable"');
    expect(page).not.toContain("fakeMetric");
  });

  it("keeps campaign lifecycle separate from external publish execution", () => {
    expect(page).toContain("execution مستقل از Campaign lifecycle");
    expect(page).toContain("OutcomeUnknown");
    expect(page).toContain("انتشار تکراری خودکار");
    expect(actions).toContain("requestMarketingCampaignPublish");
    expect(actions).not.toContain("setMarketingCampaignStatus");
  });
});
