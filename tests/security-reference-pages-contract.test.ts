import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("security references 18-20", () => {
  it("uses the shared security audit hero through next/image", () => {
    const layout = read("app/security/layout.tsx");
    expect(layout).toContain('import Image from "next/image"');
    expect(layout).toContain('/design-assets/security-audit-hero-v1.png');
    expect(layout).toContain('width={1536}');
    expect(layout).toContain('height={1024}');
    expect(layout).toContain('sizes=');
  });

  it("keeps roles and audit on canonical server-side contracts", () => {
    const roles = read("app/security/page.tsx");
    const audit = read("app/security/audit/page.tsx");
    expect(roles).toContain("getSecurityRbacMatrix");
    expect(roles).toContain('security.audit.read');
    expect(audit).toContain("getAuditLog");
    expect(audit).toContain('security.audit.read');
    expect(audit).toContain("payload خام، metadata محرمانه و secret");
  });

  it("keeps staff mutations server-side, idempotent and privileged-role immutable", () => {
    const action = read("src/lib/admin-api/staff-actions.ts");
    const serverAction = read("app/security/roles/[roleCode]/actions.ts");
    const controls = read("app/security/roles/[roleCode]/StaffMembershipControls.tsx");
    expect(serverAction).toContain('"use server"');
    expect(action).toContain('roleCode === "founder" || roleCode === "super_admin"');
    expect(action).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(action).toContain('reason.length < 10');
    expect(controls).toContain("تغییر دسترسی خودتان در API مسدود");
    expect(controls).toContain("تأیید تغییر");
  });
});
