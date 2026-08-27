import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Commerce references 10/11", () => {
  it("uses the approved commerce hero and exposes the workspace tabs", () => {
    const header = source("app/commerce/CommerceWorkspaceHeader.tsx");

    expect(header).toContain("/design-assets/commerce-hero-v1.png");
    expect(header).toContain('sizes="(max-width: 720px) 60vw, (max-width: 1100px) 34vw, 360px"');
    expect(header).toContain('href: "/commerce/catalog"');
    expect(header).toContain('href: "/commerce/plans"');
    expect(header).toContain('href: "/commerce/promotions"');
    expect(header).toContain('href: "/commerce/subscriptions"');
    expect(header).toContain('href: "/commerce/entitlements/adjustments"');
    expect(header).toContain('href: "/commerce/revenue"');
    expect(header).toContain('aria-current={active === tab.key ? "page" : undefined}');
  });

  it("keeps subscriptions read-only on the canonical Commerce Overview contract", () => {
    const page = source("app/commerce/subscriptions/page.tsx");

    expect(page).toContain("getCommerceOverview");
    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(page).toContain("Trial configuration · Core #412");
    expect(page).toContain("تغییر مستقیم Subscription از Command Center تعریف نشده است");
    expect(page).not.toContain("use server");
    expect(page).not.toContain(".from(");
  });

  it("uses the canonical Revenue read model while keeping unsupported recurring KPIs fail-closed", () => {
    const page = source("app/commerce/revenue/page.tsx");
    const client = source("src/lib/admin-api/commerce-revenue.ts");

    expect(page).toContain("getCommerceRevenue");
    expect(page).toContain("MRR جاری");
    expect(page).toContain("ARR جاری");
    expect(page).toContain("ARPU");
    expect(page).toContain("Actual transaction facts به تفکیک ارز");
    expect(page).toContain("هیچ FX یا جمع چندارزی در مرورگر انجام نمی‌شود");
    expect(page).toContain('metric.state === "unavailable"');
    expect(page).not.toContain("price × subscriber");
    expect(page).not.toContain("getCommerceOverview");
    expect(page).not.toContain(".from(");

    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/revenue");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("createClient");
  });

  it("recognizes completed Core 412 controls while keeping unsupported subscription writes explicit", () => {
    const plans = source("app/commerce/plans/page.tsx");
    const subscriptions = source("app/commerce/subscriptions/page.tsx");
    const featureControls = source("app/commerce/plans/[planId]/PlanFeatureControls.tsx");
    const discountControls = source(
      "app/commerce/promotions/[promotionId]/DiscountCodeControls.tsx",
    );

    expect(plans).toContain("Trial configuration · Core #412");
    expect(plans).toContain("Plan ↔ Feature assignment · Core #412");
    expect(plans).not.toContain("Core #412 فعال نمی‌شود");
    expect(featureControls).toContain("commerce.plan_feature.write");
    expect(discountControls).toContain("commerce.discount_code.write");
    expect(subscriptions).toContain("تغییر مستقیم Subscription از Command Center تعریف نشده است");
    expect(subscriptions).not.toContain("use server");
  });

  it("keeps the reference shell responsive and long-text safe", () => {
    const css = source("app/commerce/commerce-reference.module.css");

    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("word-break: break-word");
    expect(css).toContain("max-width: 1100px");
    expect(css).toContain("max-width: 820px");
    expect(css).toContain("max-width: 560px");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion");
  });
});
