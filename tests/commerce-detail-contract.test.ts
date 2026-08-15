import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-COM-002 Commerce Detail", () => {
  it("uses only the AAL2 Admin API boundary", () => {
    const client = source("src/lib/admin-api/commerce-detail.ts");

    expect(client).toContain("/api/v1/commerce/plans/");
    expect(client).toContain("/api/v1/commerce/entitlements/");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("keeps sensitive commerce and subject identifiers out of the detail contract", () => {
    const client = source("src/lib/admin-api/commerce-detail.ts");

    expect(client).not.toContain("providerReferenceHash");
    expect(client).not.toContain("provider_reference_hash");
    expect(client).not.toContain("sourceKey");
    expect(client).not.toContain("source_key");
    expect(client).not.toContain("payerAccountId");
    expect(client).not.toContain("ownerAccountId");
    expect(client).not.toContain("beneficiaryPersonId");
    expect(client).not.toContain("metadataJson");
  });

  it("requires commerce.read and handles missing or unavailable detail", () => {
    const plan = source("app/commerce/plans/[planId]/page.tsx");
    const entitlement = source("app/commerce/entitlements/[featureCode]/page.tsx");

    for (const page of [plan, entitlement]) {
      expect(page).toContain('admin.permissions.includes("commerce.read")');
      expect(page).toContain('activeSlug="commerce"');
      expect(page).toContain("notFound()");
      expect(page).toContain('AdminPageState state="forbidden"');
      expect(page).toContain('state="unavailable"');
    }
  });

  it("connects overview drilldowns only after protected detail routes exist", () => {
    const overview = source("app/commerce/page.tsx");
    const overviewCss = source("app/commerce/commerce.module.css");

    expect(overview).toContain("/commerce/plans/${row.planId}");
    expect(overview).toContain("/commerce/entitlements/${encodeURIComponent(row.featureCode)}");
    expect(overviewCss).toContain("text-decoration: none");
    expect(overviewCss).toContain(".planCard:hover");
    expect(overviewCss).toContain(".entitlementRow:hover");
  });

  it("does not invent plan lifecycle, transaction history, or plan-feature ordering", () => {
    const plan = source("app/commerce/plans/[planId]/page.tsx");

    expect(plan).toContain("minimumPlanCode");
    expect(plan).toContain("حدس زده نمی‌شود");
    expect(plan).toContain("instrumented");
    expect(plan).toContain("هنوز instrument نشده");
    expect(plan).toContain("transactionLinkage");
    expect(plan).toContain("amount_minor");
  });

  it("keeps bigint price values lossless and reports bounded collections", () => {
    const client = source("src/lib/admin-api/commerce-detail.ts");
    const plan = source("app/commerce/plans/[planId]/page.tsx");

    expect(client).toContain("amountMinor: string");
    expect(client).toContain("NON_NEGATIVE_INTEGER_STRING");
    expect(plan).toContain("formatIntegerString(price.amountMinor)");
    expect(plan).toContain("data.featureRules.total");
    expect(plan).toContain("data.prices.total");
  });

  it("documents effective entitlement semantics and bounded linked grants", () => {
    const client = source("src/lib/admin-api/commerce-detail.ts");
    const entitlement = source("app/commerce/entitlements/[featureCode]/page.tsx");

    expect(client).toContain("storedStatus: string");
    expect(client).toContain("effectiveStatus: string");
    expect(entitlement).toContain("فعال مؤثر");
    expect(entitlement).toContain("زمان‌بندی‌شده");
    expect(entitlement).toContain("row.effectiveStatus");
    expect(entitlement).toContain("row.storedStatus");
    expect(entitlement).toContain("data.entitlements.total");
    expect(entitlement).toContain("data.productRules.total");
    expect(entitlement).toContain("previousHref");
    expect(entitlement).toContain("nextHref");
    expect(entitlement).toContain("eventHistory");
  });

  it("keeps detail pages responsive, keyboard-visible and reduced-motion aware", () => {
    const css = source("app/commerce/detail.module.css");

    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 680px");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-violet)");
  });
});
