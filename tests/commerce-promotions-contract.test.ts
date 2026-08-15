import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-COM-005 Promotions / Discount Codes", () => {
  it("keeps all promotion reads and writes behind the server Admin API", () => {
    const client = source("src/lib/admin-api/commerce-promotions.ts");

    expect(client).toContain("/api/v1/commerce/promotions");
    expect(client).toContain("/actions/status");
    expect(client).toContain('"Idempotency-Key": idempotencyKey');
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("provider_reference");
    expect(client).not.toContain("account_id");
    expect(client).not.toContain("cardNumber");
    expect(client).not.toContain("paymentCredential");
  });

  it("keeps Promotion Discount Code Plan and Entitlement semantics separate", () => {
    const page = source("app/commerce/promotions/page.tsx");

    expect(page).toContain("Promotion ≠ Discount Code ≠ Plan");
    expect(page).toContain("هیچ‌کدام Plan، Entitlement یا Transaction نیستند");
    expect(page).toContain("/commerce/promotions/${row.promotionId}");
  });

  it("uses independent read and mutation permissions", () => {
    const page = source("app/commerce/promotions/page.tsx");
    const form = source("app/commerce/promotions/PromotionCreateForm.tsx");
    const operations = source(
      "app/commerce/promotions/[promotionId]/PromotionOperations.tsx",
    );

    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(page).toContain('admin.permissions.includes("commerce.promo.write")');
    expect(form).toContain("commerce.promo.write");
    expect(operations).toContain("commerce.promo.write");
  });

  it("prevents code enumeration and never fabricates redemption counts", () => {
    const page = source("app/commerce/promotions/page.tsx");
    const client = source("src/lib/admin-api/commerce-promotions.ts");

    expect(page).toContain("جست‌وجوی جزئی کد پشتیبانی نمی‌شود");
    expect(page).toContain("primaryCodeMasked");
    expect(client).toContain('state: "unavailable"');
    expect(client).toContain("count: null");
    expect(client).not.toContain("redemptionCount");
  });

  it("keeps fixed money lossless and promotion creation Draft-only", () => {
    const client = source("src/lib/admin-api/commerce-promotions.ts");
    const form = source("app/commerce/promotions/PromotionCreateForm.tsx");

    expect(client).toContain("fixedAmountMinor: string | null");
    expect(form).toContain("ساخت Draft");
    expect(form).toContain("پروموشن جدید همیشه Draft ساخته می‌شود");
  });

  it("makes edits and lifecycle changes separate reasoned idempotent actions", () => {
    const actions = source("app/commerce/promotions/[promotionId]/actions.ts");
    const operations = source(
      "app/commerce/promotions/[promotionId]/PromotionOperations.tsx",
    );

    expect(actions).toContain("updateCommercePromotion");
    expect(actions).toContain("setCommercePromotionStatus");
    expect(actions).toContain("idempotencyKey");
    expect(actions).toContain("reason.length < 10");
    expect(operations).toContain('name="statusReason"');
    expect(operations).toContain("ابتدا پروموشن را Pause کن");
    expect(operations).toContain("no-op audit");
  });

  it("renders explicit unavailable stale forbidden empty and audit states", () => {
    const list = source("app/commerce/promotions/page.tsx");
    const detail = source("app/commerce/promotions/[promotionId]/page.tsx");

    expect(list).toContain('state="forbidden"');
    expect(list).toContain('state="unavailable"');
    expect(list).toContain("data.freshness.status === \"stale\"");
    expect(detail).toContain('state="empty"');
    expect(detail).toContain('state="error"');
    expect(detail).toContain("security.audit.read");
    expect(detail).toContain('evidence.state === "forbidden"');
  });

  it("keeps Persian RTL visuals responsive keyboard visible and motion aware", () => {
    const list = source("app/commerce/promotions/page.tsx");
    const css = source("app/commerce/promotions/promotions.module.css");

    expect(list).toContain('dir="rtl"');
    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-orange-soft)");
    expect(css).toContain("var(--lm-violet-soft)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 760px");
    expect(css).toContain("prefers-reduced-motion");
  });
});
