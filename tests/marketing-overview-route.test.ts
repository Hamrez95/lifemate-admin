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
    expect(workspaces).toContain('return workspace.slug ? `/${workspace.slug}` : "/"');
  });

  it("uses the canonical aggregate-only attribution client without browser database access", () => {
    const page = source("app/marketing/page.tsx");
    const overview = source("src/lib/admin-api/marketing-overview.ts");
    const attribution = source("src/lib/admin-api/marketing-attribution.ts");

    expect(page).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE/i);
    expect(overview).not.toMatch(/accountId|personId|phone|email|providerPayload/i);
    expect(overview).toContain("getMarketingAttribution");
    expect(attribution).toContain("/api/v1/marketing/attribution");
    expect(attribution).toContain('import "server-only"');
    expect(attribution).toContain('attributionState: "not_instrumented"');
    expect(attribution).toContain('name: "spend" | "revenue" | "conversions" | "cac" | "roas"');
    expect(attribution).toContain('state: "unavailable"');
    expect(attribution).not.toMatch(/accountId|personId|phone|email|providerPayload/i);
    expect(attribution).not.toContain(".from(");
  });
});
