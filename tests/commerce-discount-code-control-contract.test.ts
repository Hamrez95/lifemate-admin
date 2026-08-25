import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("P0 Monetization Control Plane — independent discount codes", () => {
  it("uses only the authenticated canonical Admin API", () => {
    const client = source("src/lib/admin-api/commerce-discount-codes.ts");

    expect(client).toContain('import "server-only"');
    expect(client).toContain("/discount-codes");
    expect(client).toContain("/actions/status");
    expect(client).toContain('"Idempotency-Key": idempotencyKey');
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
  });

  it("keeps issuance bounded and requires explicit confirmation and reason", () => {
    const actions = source("app/commerce/promotions/[promotionId]/discount-code-actions.ts");
    const controls = source("app/commerce/promotions/[promotionId]/DiscountCodeControls.tsx");

    expect(actions).toContain('ISSUE_CONFIRMATION = "confirm-discount-code-issue"');
    expect(actions).toContain("codes.length > 50");
    expect(actions).toContain("generateCount > 50");
    expect(actions).toContain("reason.length < 10");
    expect(controls).toContain('value="confirm-discount-code-issue"');
    expect(controls).toContain('max="50"');
  });

  it("uses dedicated permission and optimistic versioning for code lifecycle", () => {
    const page = source("app/commerce/promotions/[promotionId]/page.tsx");
    const actions = source("app/commerce/promotions/[promotionId]/discount-code-actions.ts");
    const controls = source("app/commerce/promotions/[promotionId]/DiscountCodeControls.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.discount_code.write")');
    expect(controls).toContain("commerce.discount_code.write");
    expect(controls).toContain('name="expectedVersion"');
    expect(actions).toContain('STATUS_CONFIRMATION = "confirm-discount-code-status"');
    expect(actions).toContain("expectedVersion: Number(versionRaw)");
  });

  it("does not claim issuance mutates subscriptions or entitlements", () => {
    const controls = source("app/commerce/promotions/[promotionId]/DiscountCodeControls.tsx");
    expect(controls).toContain("Subscription یا Entitlement موجود را تغییر نمی‌دهد");
  });
});
