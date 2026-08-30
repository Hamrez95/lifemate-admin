import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-QA-001 authentication and MFA security contract", () => {
  it("uses the dedicated invite-only workforce username auth boundary without exposing internal email", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    const runtime = source("src/lib/runtime-config.ts");
    const workforceProxy = source("app/api/auth/workforce/route.ts");
    expect(login).toContain("config.adminAuthUrl");
    expect(runtime).toContain('adminAuthUrl: "/api/auth/workforce"');
    expect(workforceProxy).toContain("/functions/v1/lifemate-admin-auth");
    expect(workforceProxy).toContain("NEXT_PUBLIC_ADMIN_AUTH_URL");
    expect(workforceProxy).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(workforceProxy).not.toMatch(/SERVICE_ROLE|serviceRole|SUPABASE_DB_URL|DATABASE_URL/);
    expect(login).toContain('action: "login"');
    expect(login).toContain('action: "activate_founder"');
    expect(login).not.toContain('action: "signup"');
    expect(login).not.toContain("ثبت‌نام با نام کاربری");
    expect(login).toContain("ثبت‌نام عمومی ندارد");
    expect(login).toContain("supabase.auth.setSession");
    expect(login).not.toContain('type="email"');
    expect(login).not.toContain('type="tel"');
    expect(login).not.toContain("service_role");
    expect(login).not.toContain("SUPABASE_SERVICE_ROLE");
  });

  it("keeps non-invited or role-less identities fail-closed", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain('data.access_state === "pending_role"');
    expect(login).toContain("فقط هویت‌های دعوت‌شده");
    expect(login).toContain('signOut({ scope: "local" })');
  });

  it("requires AAL2 for every authorized workforce identity including Founder", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain("mfa.getAuthenticatorAssuranceLevel()");
    expect(login).toContain('aal.currentLevel === "aal2"');
    expect(login).toContain('aal.nextLevel === "aal2"');
    expect(login).toContain("mfa.listFactors()");
    expect(login).toContain("mfa.challengeAndVerify");
    expect(login).toContain('factorType: "totp"');
    expect(login).toContain("از جمله Founder");
    expect(login).not.toContain("founder_compat");
    expect(login).toContain("await prepareMfa()");
  });

  it("validates identity claims and dedupes the per-request capability lookup without shared auth caching", () => {
    const server = source("src/lib/admin-api/server.ts");
    const session = source("src/lib/admin-api/session.ts");
    const proxy = source("src/lib/supabase/proxy.ts");

    expect(session.indexOf("supabase.auth.getClaims()")).toBeLessThan(
      session.indexOf("supabase.auth.getSession()"),
    );
    expect(server).toContain('import { cache } from "react"');
    expect(server).toContain("const getAdminAccessForRequest = cache(");
    expect(server).toContain("return getAdminAccessForRequest()");
    expect(server).toContain("getServerAdminAccessToken");
    expect(server).toContain("Authorization: `Bearer ${token}`");
    expect(server).toContain('cache: "no-store"');
    expect(server).not.toContain("unstable_cache");
    expect(server).not.toContain("force-cache");
    expect(server).toContain("AbortSignal.timeout(10_000)");
    expect(proxy).toContain("await supabase.auth.getClaims()");
    expect(proxy).not.toContain("supabase.auth.getSession(");
  });

  it("keeps login errors generic and does not log passwords, TOTP or enrollment secrets", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain("friendlyAuthError");
    expect(login).not.toContain("console.log");
    expect(login).not.toContain("console.error");
    expect(login).not.toContain("localStorage");
    expect(login).not.toContain("sessionStorage");
  });
});
