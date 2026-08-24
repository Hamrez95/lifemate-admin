import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Commerce references 10/11", () => {
  it("uses the approved commerce hero and exposes the four workspace tabs", () => {
    const header = source("app/commerce/CommerceWorkspaceHeader.tsx");

    expect(header).toContain('/design-assets/commerce-hero-v1.png');
    expect(header).toContain('href: "/commerce/plans"');
    expect(header).toContain('href: "/commerce/promotions"');
    expect(header).toContain('href: "/commerce/subscriptions"');
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

  it("fails recurring-revenue KPIs closed instead of deriving fake money", () => {
    const page = source("app/commerce/revenue/page.tsx");

    expect(page).toContain("MRR جاری");
    expect(page).toContain("ARR جاری");
    expect(page).toContain("ARPU");
    expect(page).toContain("Revenue KPI endpoint هنوز در قرارداد فعلی Core وجود ندارد");
    expect(page).toContain("MRR/ARR/ARPU محاسبه نمی‌کنیم");
    expect(page).toContain("<strong aria-label={`${label} در دسترس نیست`}>—</strong>");
    expect(page).not.toContain("reduce((sum");
    expect(page).not.toContain("amountMinor");
  });

  it("makes Core 412 dependencies explicit and never enables missing control forms", () => {
    const plans = source("app/commerce/plans/page.tsx");
    const promotions = source("app/commerce/promotions/page.tsx");
    const subscriptions = source("app/commerce/subscriptions/page.tsx");

    for (const page of [plans, promotions, subscriptions]) {
      expect(page).toContain("Core #412");
    }
    expect(plans).toContain("فرم تنظیم Trial تا تکمیل قرارداد Core #412 فعال نمی‌شود");
    expect(plans).toContain("فرم ساختگی ارائه نمی‌شود");
    expect(promotions).toContain("هیچ generator یا edit form جداگانه فعال نیست");
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
