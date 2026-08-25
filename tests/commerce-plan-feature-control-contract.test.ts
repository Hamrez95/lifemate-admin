import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("P0 Monetization Control Plane — plan feature assignment", () => {
  it("keeps assignment behind the authenticated server-only Admin API", () => {
    const client = source("src/lib/admin-api/commerce-plan-features.ts");

    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/plans/${planId}/features");
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
  });

  it("requires least privilege optimistic versioning reason and confirmation", () => {
    const page = source("app/commerce/plans/[planId]/manage/page.tsx");
    const actions = source("app/commerce/plans/[planId]/feature-actions.ts");
    const controls = source("app/commerce/plans/[planId]/PlanFeatureControls.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.plan_feature.write")');
    expect(controls).toContain("commerce.plan_feature.write");
    expect(controls).toContain('name="expectedVersion"');
    expect(controls).toContain('value="confirm-plan-feature"');
    expect(actions).toContain('CONFIRMATION = "confirm-plan-feature"');
    expect(actions).toContain("expectedVersion");
    expect(actions).toContain("reason.length < 10");
    expect(actions).toContain("idempotencyKey");
  });

  it("does not conflate plan capability assignment with user entitlement or health access", () => {
    const controls = source("app/commerce/plans/[planId]/PlanFeatureControls.tsx");
    const page = source("app/commerce/plans/[planId]/manage/page.tsx");

    expect(controls).toContain("Entitlement یا دسترسی سلامت نمی‌دهد");
    expect(controls).toContain("هیچ Entitlement کاربری را مستقیم صادر یا لغو نمی‌کند");
    expect(page).toContain("Entitlement یک کاربر یکی نمی‌گیرد");
  });
});
