import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("P0 Monetization Control Plane — plan and pricing batch", () => {
  it("keeps catalog writes behind the authenticated server Admin API", () => {
    const client = source("src/lib/admin-api/commerce-catalog.ts");

    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/plans");
    expect(client).toContain("/prices");
    expect(client).toContain('"Idempotency-Key": idempotencyKey');
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
    expect(client).not.toContain("db_password");
  });

  it("uses independent least-privilege permissions for plan and price writes", () => {
    const page = source("app/commerce/plans/page.tsx");
    const manage = source("app/commerce/plans/[planId]/manage/page.tsx");
    const controls = source("app/commerce/plans/[planId]/PlanCatalogControls.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(page).toContain('admin.permissions.includes("commerce.plan.write")');
    expect(manage).toContain('admin.permissions.includes("commerce.plan.write")');
    expect(manage).toContain('admin.permissions.includes("commerce.price.write")');
    expect(controls).toContain("commerce.plan.write");
    expect(controls).toContain("commerce.price.write");
  });

  it("keeps price history append-only and never claims existing subscriptions are repriced", () => {
    const page = source("app/commerce/plans/page.tsx");
    const controls = source("app/commerce/plans/[planId]/PlanCatalogControls.tsx");
    const manage = source("app/commerce/plans/[planId]/manage/page.tsx");

    expect(page).toContain("overwrite نمی‌کند");
    expect(controls).toContain("مبلغ تاریخی overwrite نمی‌شود");
    expect(controls).toContain("هیچ Subscription موجود را reprice نمی‌کند");
    expect(manage).toContain("Subscription موجود را دست‌کاری");
  });

  it("keeps money lossless and converts operator Tehran time on the server", () => {
    const actions = source("app/commerce/plans/actions.ts");
    const client = source("src/lib/admin-api/commerce-catalog.ts");

    expect(actions).toContain("BigInt(amountMinor)");
    expect(actions).toContain("POSTGRES_BIGINT_MAX");
    expect(actions).toContain("tehranLocalDateTimeToUtc");
    expect(client).toContain("amountMinor: string");
    expect(actions).toContain("reason.length < 10");
    expect(actions).toContain("idempotencyKey");
  });

  it("does not fabricate Trial Entitlement or bulk-code controls before canonical contracts exist", () => {
    const page = source("app/commerce/plans/page.tsx");
    const manage = source("app/commerce/plans/[planId]/manage/page.tsx");

    expect(page).toContain("Trial، Entitlement assignment و bulk Discount Code");
    expect(page).toContain("قابلیت جعلی نمی‌سازد");
    expect(manage).toContain("Trial policy و Entitlement assignment");
  });

  it("keeps Persian RTL UI responsive keyboard visible and motion aware", () => {
    const page = source("app/commerce/plans/page.tsx");
    const css = source("app/commerce/plans/catalog.module.css");

    expect(page).toContain('dir="rtl"');
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-green-soft)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 760px");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).not.toContain("linear-gradient");
  });
});
