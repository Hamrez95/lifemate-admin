import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-COM-001 Commerce Dashboard", () => {
  it("reads commerce only through the Admin API", () => {
    const client = source("src/lib/admin-api/commerce-dashboard.ts");

    expect(client).toContain("/api/v1/commerce/dashboard?");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("provider_reference_hash");
    expect(client).not.toContain("card_number");
  });

  it("requires commerce.read and keeps the three commerce concepts explicit", () => {
    const page = source("app/commerce/page.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(page).toContain("Plan ≠ Subscription");
    expect(page).toContain("Entitlement ≠ Plan");
    expect(page).toContain("AdminDataTable");
    expect(page).toContain("بدون درآمد یا KPI ساختگی");
  });

  it("uses server pagination and bounded operational filters", () => {
    const page = source("app/commerce/page.tsx");

    expect(page).toContain('params.set("pageSize", "25")');
    expect(page).toContain('name="product"');
    expect(page).toContain('name="plan"');
    expect(page).toContain('name="status"');
    expect(page).toContain("previousHref: previousPage");
    expect(page).toContain("nextHref: nextPage");
  });

  it("minimizes identity and never renders payment reference material", () => {
    const page = source("app/commerce/page.tsx");

    expect(page).toContain("customerAccountId");
    expect(page).toContain("provider reference و داده پرداخت نمایش داده نمی‌شود");
    expect(page).not.toContain("providerReferenceHash");
    expect(page).not.toContain("paymentSecret");
    expect(page).not.toContain("fullCard");
  });

  it("keeps commerce visuals responsive, keyboard visible and motion aware", () => {
    const css = source("app/commerce/commerce.module.css");

    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-violet)");
    expect(css).toContain("var(--lm-orange)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 580px");
    expect(css).toContain("prefers-reduced-motion");
  });
});
