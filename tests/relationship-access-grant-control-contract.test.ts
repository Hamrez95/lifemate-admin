import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("P1 safe Access Grant lifecycle controls", () => {
  it("keeps mutations on the authenticated server-only canonical Admin API", () => {
    const client = source("src/lib/admin-api/relationship-access-grant-actions.ts");

    expect(client).toContain('import "server-only"');
    expect(client).toContain(
      "/api/v1/relationships/access-grants/${input.grantId}/actions/${input.action}",
    );
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
  });

  it("requires dedicated permission, optimistic version, reason and explicit confirmation", () => {
    const page = source("app/relationships/page.tsx");
    const actions = source("app/relationships/actions.ts");
    const controls = source("app/relationships/AccessGrantActions.tsx");

    expect(page).toContain('admin.permissions.includes("relationships.access_grant.write")');
    expect(controls).toContain('name="expectedVersion"');
    expect(controls).toContain('value="confirm-access-grant-change"');
    expect(actions).toContain('"confirm-access-grant-change"');
    expect(actions).toContain("reason.length < 10");
    expect(actions).toContain("idempotencyKey");
  });

  it("keeps scope replacement reduction-only and does not create grants", () => {
    const controls = source("app/relationships/AccessGrantActions.tsx");
    const page = source("app/relationships/page.tsx");
    const client = source("src/lib/admin-api/relationship-access-grant-actions.ts");

    expect(controls).toContain("افزودن scope جدید از این پنل ممکن نیست");
    expect(page).toContain("اضافه‌کردن scope جدید ممنوع است");
    expect(client).not.toContain("/create");
    expect(client).not.toContain("relationshipId");
    expect(client).not.toContain("consentId");
  });
});
