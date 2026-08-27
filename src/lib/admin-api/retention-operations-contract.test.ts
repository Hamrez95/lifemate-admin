import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

describe("retention operations contract", () => {
  it("uses only the canonical server-side Admin API boundary", async () => {
    const client = await source("src/lib/admin-api/retention-operations.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/security/retention/policies");
    expect(client).toContain("/api/v1/security/retention/deletion-preview");
    expect(client).toContain("/api/v1/security/retention/holds");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_SERVICE_ROLE");
  });

  it("keeps preview non-destructive and mutation flows idempotent", async () => {
    const client = await source("src/lib/admin-api/retention-operations.ts");
    const page = await source("app/security/retention/page.tsx");
    const actions = await source("app/security/retention/actions.ts");
    expect(client).toContain("destructiveActionPerformed: false");
    expect(client).toContain('"Idempotency-Key"');
    expect(page).toContain("این صفحه دکمه حذف مستقیم row ندارد");
    expect(page).toContain("subscription");
    expect(actions).toContain("confirm-retention-policy");
    expect(actions).toContain("confirm-retention-hold");
    expect(actions).toContain("confirm-retention-hold-release");
    expect(actions).not.toContain("deleteRow");
  });

  it("requires explicit retention permissions before rendering mutations", async () => {
    const page = await source("app/security/retention/page.tsx");
    expect(page).toContain('admin.permissions.includes("security.retention.read")');
    expect(page).toContain('admin.permissions.includes("security.retention.write")');
    expect(page).toContain('redirect("/forbidden")');
  });
});
