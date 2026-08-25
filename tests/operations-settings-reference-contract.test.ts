import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Operations reference 17 and Settings reference 27", () => {
  it("keeps operations visibility truthful and server-authorized", () => {
    const page = source("app/operations/page.tsx");
    expect(page).toContain('includes("operations.read")');
    expect(page).toContain("Operational visibility");
    expect(page).toContain("Unavailable");
    expect(page).not.toContain("99.9%");
    expect(page).not.toContain("p95:");
  });

  it("keeps settings fail-closed and canonical without client secrets or unsupported writes", () => {
    const page = source("app/settings/page.tsx");
    const form = source("app/settings/SettingsPreferencesForm.tsx");
    const action = source("app/settings/actions.ts");

    expect(page).toContain('includes("settings.read")');
    expect(page).toContain('includes("settings.write")');
    expect(page).toContain("Settings API فعلاً در دسترس نیست.");
    expect(page).toContain("فرم fail-closed باقی می‌ماند");
    expect(form).toContain('name="confirmation" value="confirm-settings-change"');
    expect(form).toContain('name="idempotencyKey"');
    expect(form).toContain('name="expectedVersion"');
    expect(form).toContain('name="reason"');
    expect(action).toContain('confirmation !== "confirm-settings-change"');
    expect(page).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(page).not.toContain("process.env");
    expect(page).not.toContain("fetch(");
    expect(form).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("preserves RTL and long-text responsive safeguards", () => {
    const css = source("app/ops-settings.module.css");
    expect(css).toContain("direction: rtl");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("@media (max-width: 720px)");
  });
});
