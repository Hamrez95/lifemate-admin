import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/admin-api/marketing-campaigns.ts", "utf8");
const actions = readFileSync("app/marketing/campaigns/actions.ts", "utf8");
const page = readFileSync("app/marketing/campaigns/page.tsx", "utf8");

describe("ADM-MKT-002 campaign boundaries", () => {
  it("uses only the server Admin API with bounded timeout and no-store semantics", () => {
    expect(client).toContain("createServerSupabaseClient");
    expect(client).toContain("/api/v1/marketing/campaigns");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toMatch(/service[_-]?role/i);
    expect(client).not.toMatch(/SUPABASE_DB_URL|DATABASE_URL/);
  });

  it("requires idempotency for create, update and status mutations", () => {
    expect(client.match(/Idempotency-Key/g)?.length).toBeGreaterThanOrEqual(3);
    expect(client).toContain("IDEMPOTENCY_PATTERN");
    expect(actions).toContain("campaign-create-");
    expect(actions).toContain("campaign-status-");
  });

  it("keeps provider publication outside the campaign workflow", () => {
    expect(page).toContain("بدون auto-publish");
    expect(page).toContain("وضعیت کمپین با وضعیت انتشار شبکه اجتماعی یکی نیست");
    expect(client).not.toContain("marketing.social.publish");
    expect(client).not.toMatch(/providerToken|accessToken|refreshToken/);
  });
});
