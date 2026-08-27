import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("P0 custom roles console", () => {
  it("uses only the canonical server-side custom role API", () => {
    const client = source("src/lib/admin-api/custom-roles.ts");

    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/security/custom-roles");
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
  });

  it("keeps read and write permissions independent", () => {
    const page = source("app/security/roles/custom/page.tsx");

    expect(page).toContain('admin.permissions.includes("security.audit.read")');
    expect(page).toContain('admin.permissions.includes("security.roles.write")');
    expect(page).toContain("هیچ role یا permission محلی/فرضی");
  });

  it("requires explicit confirmation version and reason for sensitive mutations", () => {
    const actions = source("app/security/roles/custom/actions.ts");

    expect(actions).toContain("expectedVersion");
    expect(actions).toContain("reason.length < 10");
    expect(actions).toContain("confirm-custom-role-create");
    expect(actions).toContain("confirm-custom-role-update");
    expect(actions).toContain("confirm-custom-role-retire");
    expect(actions).toContain("confirm-custom-role-permission-");
    expect(actions).toContain("IDEMPOTENCY_KEY");
  });

  it("preserves Founder and elevated-permission boundaries in product copy", () => {
    const page = source("app/security/roles/custom/page.tsx");
    const actions = source("app/security/roles/custom/actions.ts");

    expect(page).toContain("Founder");
    expect(page).toContain("Elevated");
    expect(page).toContain("allow-listed");
    expect(actions).toContain('code === "founder"');
    expect(actions).toContain('code === "super_admin"');
  });

  it("keeps mutation success distinct from the read model", () => {
    const client = source("src/lib/admin-api/custom-roles.ts");

    expect(client).toContain("export type CustomRoleMutationResult");
    expect(client).toContain('{ kind: "ok"; replayed: boolean }');
    expect(client).not.toContain("roles: [], permissionCatalog: []");
  });

  it("keeps the page responsive keyboard-visible and motion-aware", () => {
    const css = source("app/security/roles/custom/custom-roles.module.css");

    expect(css).toContain("max-width: 820px");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});
