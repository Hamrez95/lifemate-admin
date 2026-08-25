import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("security references 18-20", () => {
  it("uses the canonical security hero through next/image and keeps navigation server-authorized", async () => {
    const header = await source("src/components/security/SecurityContextHeader.tsx");
    const shell = await source("src/components/shell/AdminShell.tsx");

    expect(header).toContain('from "next/image"');
    expect(header).toContain('/design-assets/security-audit-hero-v1.png');
    expect(header).toContain('width={1536}');
    expect(header).toContain('height={1024}');
    expect(header).toContain('href="/security"');
    expect(header).toContain('href="/security/audit"');
    expect(shell).toContain('activeSlug === "security"');
  });

  it("keeps Founder and self-escalation controls disabled before a mutation form can render", async () => {
    const controls = await source("app/security/roles/[roleCode]/StaffMembershipControls.tsx");

    expect(controls).toContain('roleCode === "founder"');
    expect(controls).toContain('roleCode === "super_admin"');
    expect(controls).toContain("admin.accountId");
    expect(controls).toContain("Founder / Super Admin تغییرناپذیر است");
    expect(controls).toContain("تغییر دسترسی خودتان مجاز نیست");
    expect(controls).toContain("AAL2");
    expect(controls).toContain("idempotency");
    expect(controls).toContain("audit");
  });

  it("keeps the server adapter fail-closed for privileged roles with reason and idempotency", async () => {
    const adapter = await source("src/lib/admin-api/staff-actions.ts");

    expect(adapter).toContain('roleCode === "founder"');
    expect(adapter).toContain('roleCode === "super_admin"');
    expect(adapter).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(adapter).toContain("reason.length < 10");
    expect(adapter).toContain('cache: "no-store"');
  });
});
