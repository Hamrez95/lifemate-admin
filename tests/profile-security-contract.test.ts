import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Admin profile security contract", () => {
  it("keeps the profile route server-authorized and exposes only a masked account identity", () => {
    const page = source("app/profile/page.tsx");
    expect(page).toContain("requireAdminAccess");
    expect(page).toContain("admin.accountId.slice(0, 8)");
    expect(page).toContain("تغییر نام کاربری تا زمان آماده‌شدن قرارداد");
    expect(page).not.toContain("admin.email");
  });

  it("supports verified TOTP backup factors without allowing the last factor to be removed", () => {
    const panel = source("src/components/auth/SecurityFactorsPanel.tsx");
    expect(panel).toContain("mfa.listFactors");
    expect(panel).toContain('factorType: "totp"');
    expect(panel).toContain("mfa.challengeAndVerify");
    expect(panel).toContain("mfa.unenroll");
    expect(panel).toContain("factors.length <= 1");
    expect(panel).not.toContain("console.log");
    expect(panel).not.toContain("console.error");
  });

  it("keeps security feedback accessible and does not persist MFA secrets in browser storage", () => {
    const panel = source("src/components/auth/SecurityFactorsPanel.tsx");
    expect(panel).toContain('role={messageTone === "error" ? "alert" : "status"}');
    expect(panel).toContain('autoComplete="one-time-code"');
    expect(panel).not.toContain("localStorage");
    expect(panel).not.toContain("sessionStorage");
  });

  it("provides an explicit global sign-out action for account session recovery", () => {
    const panel = source("src/components/auth/SessionControlPanel.tsx");
    expect(panel).toContain('signOut({ scope: "global" })');
    expect(panel).toContain('router.replace("/login")');
    expect(panel).toContain("window.confirm");
  });
});
