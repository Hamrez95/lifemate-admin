import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Admin #185 preference-purpose policy administration", () => {
  it("uses only the canonical Admin policy directory and mutation", () => {
    const client = source("src/lib/admin-api/privacy-preference-policies.ts");
    expect(client).toContain("/api/v1/privacy/preference-purposes?");
    expect(client).toContain("/api/v1/privacy/preference-purposes/${encodeURIComponent(normalized.purpose)}");
    expect(client).toContain('"Idempotency-Key": idempotencyKey(normalized)');
    expect(client).toContain("expectedUpdatedAt: normalized.expectedUpdatedAt");
    expect(client).not.toContain("supabase.from");
    expect(client).not.toContain("service_role");
  });

  it("keeps policy administration distinct from user opt-in authority", () => {
    const page = source("app/privacy/preference-purposes/page.tsx");
    const action = source("app/privacy/preference-purposes/actions.ts");
    expect(page).toContain('admin.permissions.includes("privacy.consent.read")');
    expect(page).toContain('admin.permissions.includes("privacy.consent.manage")');
    expect(page).toContain("تغییر policy هرگز به معنی Opt-in کاربر یا");
    expect(page).toContain('name="expectedUpdatedAt" value={item.updatedAtUtc}');
    expect(action).toContain("updatePreferencePurposePolicy");
    expect(action).not.toContain("accountId");
    expect(action).not.toContain("subjectPersonId");
  });

  it("allows only canonical Active/Retired lifecycle from the UI", () => {
    const page = source("app/privacy/preference-purposes/page.tsx");
    expect(page).toContain('<option value="Active">Active</option>');
    expect(page).toContain('<option value="Retired">Retired</option>');
    expect(page).not.toContain('value="Enabled"');
    expect(page).not.toContain('value="OptedIn"');
  });
});
