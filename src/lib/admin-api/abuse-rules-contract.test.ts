import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

describe("abuse rules workspace contract", () => {
  it("uses the canonical server-only Admin API without browser database access", async () => {
    const client = await source("src/lib/admin-api/abuse-rules.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/security/abuse/rules");
    expect(client).toContain("/api/v1/security/abuse/decisions");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("keeps decision review privacy-minimized and explainable", async () => {
    const client = await source("src/lib/admin-api/abuse-rules.ts");
    const page = await source("app/security/abuse/page.tsx");
    expect(client).toContain("subjectIdentifiersExposed: false");
    expect(client).toContain("rawContactValuesExposed: false");
    expect(page).toContain("Allow، Deny یا RequireApproval");
    expect(page).toContain("هیچ اقدام تنبیهی خودکار");
    expect(page).not.toContain("health data");
  });

  it("requires explicit permissions, confirmation and idempotency for writes", async () => {
    const page = await source("app/security/abuse/page.tsx");
    const actions = await source("app/security/abuse/actions.ts");
    expect(page).toContain('admin.permissions.includes("security.abuse.read")');
    expect(page).toContain('admin.permissions.includes("security.abuse.write")');
    expect(actions).toContain("confirm-abuse-rule");
    expect(actions).toContain("confirm-abuse-rule-retire");
    expect(actions).toContain("idempotencyKey");
    expect(actions).toContain("Rule Kind");
  });
});
