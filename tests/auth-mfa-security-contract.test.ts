import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-QA-001 authentication and MFA security contract", () => {
  it("never creates a LifeMate account from the internal admin login flow", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain("shouldCreateUser: false");
    expect(login).toContain("فقط حساب موجود LifeMate پذیرفته است");
    expect(login).toContain('type: "sms"');
  });

  it("requires AAL2 and supports verified TOTP challenge or controlled enrollment", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain("mfa.getAuthenticatorAssuranceLevel()");
    expect(login).toContain('aal.currentLevel === "aal2"');
    expect(login).toContain('aal.nextLevel === "aal2"');
    expect(login).toContain("mfa.listFactors()");
    expect(login).toContain("mfa.challengeAndVerify");
    expect(login).toContain('factorType: "totp"');
    expect(login).toContain("Command Center نشست AAL2 را الزامی می‌کند");
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
    expect(proxy).not.toContain("getSession()");
  });

  it("keeps login errors generic and does not log OTP TOTP or enrollment secrets", () => {
    const login = source("src/components/auth/AdminLoginFlow.tsx");
    expect(login).toContain("friendlyAuthError");
    expect(login).not.toContain("console.log");
    expect(login).not.toContain("console.error");
    expect(login).not.toContain("localStorage");
    expect(login).not.toContain("sessionStorage");
  });
});
