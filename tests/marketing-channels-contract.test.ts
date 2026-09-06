import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/admin-api/marketing-channels.ts", "utf8");
const page = readFileSync("app/marketing/channels/page.tsx", "utf8");
const actions = readFileSync("app/marketing/channels/actions.ts", "utf8");

describe("ADM-MKT-005 secure channel boundary", () => {
  it("reads only through the server Admin API with bounded no-store requests", () => {
    expect(client).toContain("createServerSupabaseClient");
    expect(client).toContain("/api/v1/marketing/channels");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toMatch(/service[_-]?role|DATABASE_URL|SUPABASE_DB_URL/i);
  });

  it("never exposes or accepts provider credential values in the browser workspace", () => {
    expect(page).toContain("Credential موجود");
    expect(page).toContain("مقدار Credential");
    expect(page).not.toMatch(/name=["'](?:accessToken|refreshToken|secret|credential)["']/i);
    expect(client).not.toMatch(/accessToken|refreshToken|decrypted_secret|credentialSecretName/);
    expect(actions).not.toMatch(/accessToken|refreshToken|secretValue/);
  });

  it("accepts only normalized provider evidence and never upgrades credential presence to Connected", () => {
    expect(client).toContain("MarketingProviderConnectivity");
    expect(client).toContain('"Verified"');
    expect(client).toContain('"VerificationStale"');
    expect(client).toContain('"ReconnectRequired"');
    expect(client).toContain("CONNECTIVITY_STATES.has");
    expect(client).toContain("CAPABILITY_STATES.has");
    expect(page).toContain("Verified = فقط با provider evidence معتبر");
    expect(page).toContain("Credential روی سرور موجود است؛ این به معنی اتصال");
    expect(page).not.toContain('providerConnectivity: "Connected"');
  });

  it("surfaces health, failure, configuration and operation readiness without inventing missing data", () => {
    expect(page).toContain("آخرین health check");
    expect(page).toContain("آخرین تأیید موفق");
    expect(page).toContain("آخرین خطای نرمال‌شده");
    expect(page).toContain("کامل بودن تنظیمات");
    expect(page).toContain("آمادگی انتشار");
    expect(page).toContain("آمادگی Analytics");
    expect(page).toContain("اقدام لازم");
    expect(page).toContain("از API گزارش نشده");
    expect(client).toContain("healthFailureCode");
    expect(client).toContain("configurationCompleteness");
    expect(client).toContain("capabilities");
  });
});
