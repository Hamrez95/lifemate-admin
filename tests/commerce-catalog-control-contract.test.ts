import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("P0 Monetization Control Plane — plan pricing and trial batch", () => {
  it("keeps catalog writes behind the authenticated server Admin API", () => {
    const client = source("src/lib/admin-api/commerce-catalog.ts");

    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/plans");
    expect(client).toContain("/prices");
    expect(client).toContain("/trial-policy");
    expect(client).toContain('"Idempotency-Key": idempotencyKey');
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
    expect(client).not.toContain("db_password");
  });

  it("uses independent least-privilege permissions for plan price and trial writes", () => {
    const page = source("app/commerce/plans/page.tsx");
    const manage = source("app/commerce/plans/[planId]/manage/page.tsx");
    const controls = source("app/commerce/plans/[planId]/PlanCatalogControls.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(page).toContain('admin.permissions.includes("commerce.plan.write")');
    expect(manage).toContain('admin.permissions.includes("commerce.plan.write")');
    expect(manage).toContain('admin.permissions.includes("commerce.price.write")');
    expect(manage).toContain('admin.permissions.includes("commerce.trial.write")');
    expect(controls).toContain("commerce.plan.write");
    expect(controls).toContain("commerce.price.write");
    expect(controls).toContain("commerce.trial.write");
  });

  it("requires explicit operator confirmation for lifecycle price and trial changes", () => {
    const actions = source("app/commerce/plans/actions.ts");
    const controls = source("app/commerce/plans/[planId]/PlanCatalogControls.tsx");

    expect(actions).toContain('PLAN_CHANGE_CONFIRMATION = "confirm-plan-change"');
    expect(actions).toContain('PRICE_CHANGE_CONFIRMATION = "confirm-price-version"');
    expect(actions).toContain('TRIAL_CHANGE_CONFIRMATION = "confirm-trial-policy"');
    expect(actions).toContain("confirmation !== PLAN_CHANGE_CONFIRMATION");
    expect(actions).toContain("confirmation !== PRICE_CHANGE_CONFIRMATION");
    expect(actions).toContain("confirmation !== TRIAL_CHANGE_CONFIRMATION");
    expect(controls).toContain('value="confirm-plan-change"');
    expect(controls).toContain('value="confirm-price-version"');
    expect(controls).toContain('value="confirm-trial-policy"');
    expect(controls).toContain('name="confirmation"');
    expect(controls).toContain("required");
  });

  it("keeps trial edits versioned and restricted to the canonical eligibility rule", () => {
    const actions = source("app/commerce/plans/actions.ts");
    const controls = source("app/commerce/plans/[planId]/PlanCatalogControls.tsx");
    const client = source("src/lib/admin-api/commerce-catalog.ts");

    expect(actions).toContain('eligibilityRule: "NoPriorTrialForProduct"');
    expect(actions).toContain("expectedVersion");
    expect(actions).toContain("durationDays < 1");
    expect(actions).toContain("durationDays > 365");
    expect(controls).toContain('name="expectedVersion"');
    expect(controls).toContain("trialPolicy?.version ?? 0");
    expect(client).toContain("getCommerceTrialPolicy");
    expect(client).toContain("configureCommerceTrial");
  });

  it("keeps price history append-only and never claims existing subscriptions are repriced", () => {
    const page = source("app/commerce/plans/page.tsx");
    const controls = source("app/commerce/plans/[planId]/PlanCatalogControls.tsx");
    const manage = source("app/commerce/plans/[planId]/manage/page.tsx");

    expect(page).toContain("Subscription قبلی را به‌صورت ضمنی بازنویسی نمی‌کند");
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

  it("keeps entitlement and discount-code controls blocked on the remaining Core 412 work", () => {
    const page = source("app/commerce/plans/page.tsx");
    const manage = source("app/commerce/plans/[planId]/manage/page.tsx");

    expect(page).toContain("Entitlement assignment · Core #412");
    expect(page).toContain("Discount-code issuance جداگانه و bulk");
    expect(page).toContain("Core #412 فعال نمی‌شود");
    expect(manage).toContain("Entitlement assignment");
    expect(manage).toContain("Discount-code issuance");
  });

  it("keeps Persian RTL UI responsive keyboard visible and motion aware", () => {
    const page = source("app/commerce/plans/page.tsx");
    const css = source("app/commerce/plans/catalog.module.css");
    const sharedCss = source("app/commerce/commerce-reference.module.css");

    expect(page).toContain('dir="rtl"');
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-green-soft)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 760px");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).not.toContain("linear-gradient");
    expect(sharedCss).toContain("max-width: 820px");
    expect(sharedCss).toContain("overflow-wrap: anywhere");
  });
});
