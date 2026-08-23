import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Login/MFA reference design contract", () => {
  it("uses the approved login hero without moving copy into the image", () => {
    const page = source("app/login/page.tsx");
    expect(page).toContain('src="/design-assets/login-mfa-hero-v1.png"');
    expect(page).toContain("AdminLoginFlow");
    expect(page).toContain("alt=");
    expect(page).toContain("ورود امن به مرکز فرماندهی LifeMate");
  });

  it("keeps founder activation, AAL2, TOTP and fail-closed access logic unchanged", () => {
    const flow = source("src/components/auth/AdminLoginFlow.tsx");
    expect(flow).toContain('action: "activate_founder"');
    expect(flow).toContain('data.access_state === "founder_compat"');
    expect(flow).toContain('data.access_state === "pending_role"');
    expect(flow).toContain("mfa.getAuthenticatorAssuranceLevel()");
    expect(flow).toContain('aal.currentLevel === "aal2"');
    expect(flow).toContain("mfa.challengeAndVerify");
    expect(flow).toContain('signOut({ scope: "local" })');
    expect(flow).not.toMatch(/service_role|DATABASE_URL|SUPABASE_SERVICE_ROLE/i);
  });

  it("keeps submit controls disabled while pending and renders a visual spinner", () => {
    const flow = source("src/components/auth/AdminLoginFlow.tsx");
    const styles = source("app/admin-auth-founder.css");
    expect(flow.match(/disabled=\{pending\}/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(styles).toContain(".primary-button:disabled::before");
    expect(styles).toContain("animation: auth-spin");
  });

  it("keeps loading concise and exposes accessible error/success status messaging", () => {
    const flow = source("src/components/auth/AdminLoginFlow.tsx");
    expect(flow).toContain('role="status"');
    expect(flow).toContain('aria-live="polite"');
    expect(flow).toContain("در حال بررسی نشست امن...");
    expect(flow).toContain("ثبت‌نام انجام شد.");
    expect(flow).toContain("حساب شما ثبت شده اما هنوز نقش و دسترسی");
    expect(flow).toContain("نام کاربری یا رمز عبور صحیح نیست");
  });
});
