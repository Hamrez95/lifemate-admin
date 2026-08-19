import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-QA-001 authentication and MFA security contract", () => {
  it("uses the dedicated workforce username auth boundary without exposing internal email", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain("lifemate-admin-auth");
    expect(login).toContain('action: "login"');
    expect(login).toContain('action: "signup"');
    expect(login).toContain("ثبت‌نام با نام کاربری و رمز عبور");
    expect(login).toContain("ورود با نام کاربری");
    expect(login).toContain("supabase.auth.setSession");
    expect(login).not.toContain('type="email"');
    expect(login).not.toContain('type="tel"');
    expect(login).not.toContain("service_role");
    expect(login).not.toContain("SUPABASE_SERVICE_ROLE");
  });

  it("keeps self-registration default-deny until Founder assigns a role", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain('data.access_state === "pending_role"');
    expect(login).toContain("تا زمان تأیید مدیر سیستم");
    expect(login).toContain("هیچ دسترسی مدیریتی");
    expect(login).toContain('signOut({ scope: "local" })');
  });

  it("requires AAL2 for ordinary staff and supports verified TOTP challenge or controlled enrollment", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain("mfa.getAuthenticatorAssuranceLevel()");
    expect(login).toContain('aal.currentLevel === "aal2"');
    expect(login).toContain('aal.nextLevel === "aal2"');
    expect(login).toContain("mfa.listFactors()");
    expect(login).toContain("mfa.challengeAndVerify");
    expect(login).toContain('factorType: "totp"');
    expect(login).toContain("Command Center نشست AAL2 را الزامی می‌کند");
    expect(login).toContain('data.access_state === "founder_compat"');
  });

  it("validates identity claims before using a session token server-side", () => {
    const server = source("src/lib/admin-api/server.ts");
    const proxy = source("src/lib/supabase/proxy.ts");

    expect(server.indexOf("supabase.auth.getClaims()")).toBeLessThan(
      server.indexOf("supabase.auth.getSession()"),
    );
    expect(server).toContain("Authorization: `Bearer ${token}`");
    expect(server).toContain('cache: "no-store"');
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
