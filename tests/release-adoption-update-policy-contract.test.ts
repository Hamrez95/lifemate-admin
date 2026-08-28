import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Admin #190 release adoption and update policy", () => {
  it("uses server-only canonical Admin API paths", () => {
    const client = source("src/lib/admin-api/product-release.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/analytics/product-version-adoption");
    expect(client).toContain("/api/v1/platform/product-update-policies");
    expect(client).toContain("/api/v1/platform/product-update-policies/history");
    expect(client).toContain("/api/v1/analytics/accounts/");
    expect(client).toContain("/product-versions");
    expect(client).not.toContain("createServerSupabaseClient");
    expect(client).not.toContain("service_role");
  });

  it("keeps mutations permissioned, idempotent, and optimistic", () => {
    const action = source("app/operations/releases/actions.ts");
    const client = source("src/lib/admin-api/product-release.ts");
    expect(action).toContain('admin.permissions.includes("platform.update_policy.write")');
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain("expectedVersion: input.expectedVersion");
    expect(action).toContain("Number.isNaN(effectiveAt.getTime())");
    expect(action).toContain('"Critical"');
    expect(action).toContain('"Security"');
    expect(action).toContain('"BreakingCompatibility"');
  });

  it("shows canonical adoption, immutable history, and targeted campaign handoff", () => {
    const page = source("app/operations/releases/page.tsx");
    expect(page).toContain("getProductVersionAdoption");
    expect(page).toContain("getProductUpdatePolicyHistory");
    expect(page).toContain("Immutable history");
    expect(page).toContain('href="/marketing/campaigns"');
    expect(page).toContain("Force فقط برای");
    expect(page).not.toContain("direct Supabase");
  });
});
