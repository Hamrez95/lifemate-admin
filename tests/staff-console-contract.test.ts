import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Founder Staff Console canonical boundary", () => {
  it("uses the authenticated server-only Admin API and never browser database access", () => {
    const client = source("src/lib/admin-api/staff-directory.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/staff");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("Authorization: `Bearer ${token}`");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
  });

  it("keeps staff directory and detail behind dedicated permissions", () => {
    const list = source("app/security/staff/page.tsx");
    const detail = source("app/security/staff/[accountId]/page.tsx");
    expect(list).toContain('admin.permissions.includes("security.staff.manage")');
    expect(detail).toContain('admin.permissions.includes("security.staff.manage")');
    expect(detail).toContain('admin.permissions.includes("security.staff.audit.read")');
  });

  it("renders provider uncertainty instead of fabricating MFA or sensitive identity data", () => {
    const client = source("src/lib/admin-api/staff-directory.ts");
    const list = source("app/security/staff/page.tsx");
    const detail = source("app/security/staff/[accountId]/page.tsx");
    expect(client).toContain('mfaPostureSource: "unavailable"');
    expect(list).toContain("Provider signal در contract موجود نیست");
    expect(detail).toContain("token، credential، raw health data");
  });

  it("preserves the existing canonical mutation path instead of adding an unsafe shortcut", () => {
    const detail = source("app/security/staff/[accountId]/page.tsx");
    expect(detail).toContain("workflow canonical موجود در صفحه Role Detail");
    expect(detail).not.toContain("performStaffAction");
  });
});
