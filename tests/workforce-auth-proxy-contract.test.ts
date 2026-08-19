import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("workforce authentication transport boundary", () => {
  it("keeps browser workforce auth same-origin", () => {
    const runtimeConfig = source("src/lib/runtime-config.ts");
    expect(runtimeConfig).toContain('adminAuthUrl: "/api/auth/workforce"');
    expect(runtimeConfig).not.toContain("`${supabaseUrl}/functions/v1/lifemate-admin-auth`");
  });

  it("forwards only bounded known auth actions to the public edge function", () => {
    const route = source("app/api/auth/workforce/route.ts");
    expect(route).toContain("MAX_BODY_BYTES = 16_384");
    expect(route).toContain('new Set(["login", "signup", "activate_founder"])');
    expect(route).toContain("/functions/v1/lifemate-admin-auth");
    expect(route).toContain("apikey: publishableKey");
    expect(route).toContain("Origin: new URL(request.url).origin");
    expect(route).toContain('cache: "no-store"');
    expect(route).not.toMatch(/SERVICE_ROLE|serviceRole|SUPABASE_DB_URL|DATABASE_URL/);
  });

  it("fails closed for cross-origin browser calls and upstream outages", () => {
    const route = source("app/api/auth/workforce/route.ts");
    expect(route).toContain('code: "origin_denied"');
    expect(route).toContain('code: "auth_service_unavailable"');
    expect(route).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(route).toContain("UPSTREAM_TIMEOUT_MS = 12_000");
  });
});
