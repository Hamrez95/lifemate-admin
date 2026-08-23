import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-SEC-004 staff controls", () => {
  it("uses only canonical, purpose-specific Admin API endpoints", () => {
    const client = source("src/lib/admin-api/staff-actions.ts");
    expect(client).toContain("/api/v1/staff/${input.accountId}/roles/${input.action}");
    expect(client).toContain("/api/v1/staff/${input.accountId}/actions/${input.action}");
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain("Authorization: `Bearer ${token}`");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("keeps privileged roles and self-service escalation out of the UI flow", () => {
    const client = source("src/lib/admin-api/staff-actions.ts");
    const menu = source("app/security/roles/[roleCode]/StaffMembershipControls.tsx");
    expect(client).toContain('roleCode === "founder" || roleCode === "super_admin"');
    expect(menu).toContain("تغییر دسترسی خودتان در API مسدود");
    expect(menu).toContain("می‌شود.");
    expect(menu).toContain("minLength={10}");
    expect(menu).toContain('name="idempotencyKey"');
  });

  it("renders sensitive staff controls only for security.staff.manage", () => {
    const page = source("app/security/roles/[roleCode]/page.tsx");
    expect(page).toContain('admin.permissions.includes("security.staff.manage")');
    expect(page).toContain("canManage={canManageStaff}");
  });
});
