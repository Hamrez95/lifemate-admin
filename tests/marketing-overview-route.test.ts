import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("ADM-MKT-001 Marketing workspace routing and privacy", () => {
  it("uses the existing Marketing RBAC permission", () => {
    const page = source("app/marketing/page.tsx");
    expect(page).toContain('admin.permissions.includes("marketing.read")');
  });

  it("is discoverable from the configured Marketing workspace", () => {
    const workspaces = source("src/config/workspaces.ts");
    expect(workspaces).toContain('slug: "marketing"');
    expect(workspaces).toContain('requiredPermissions: ["marketing.read"]');
    expect(workspaces).toContain("return workspace.slug ? `/${workspace.slug}` : \"/\"");
  });

  it("does not add direct browser database access or fake attribution fields", () => {
    const page = source("app/marketing/page.tsx");
    const contract = source("src/lib/admin-api/marketing-overview.ts");

    expect(page).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE/i);
    expect(contract).not.toMatch(/accountId|personId|phone|email|providerPayload/i);
    expect(contract).toContain('state: "not_instrumented"');
    expect(contract).toContain("activeCount: null");
    expect(contract).toContain("attributedAccounts: null");
  });
});
