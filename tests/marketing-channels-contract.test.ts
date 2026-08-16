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

  it("keeps connectivity truthful instead of claiming Connected", () => {
    expect(client).toContain('providerConnectivity: "NotVerified"');
    expect(page).toContain("بررسی نشده");
    expect(page).not.toContain('providerConnectivity: "Connected"');
  });
});
