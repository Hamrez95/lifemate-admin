import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-COM-003 Transactions / Orders List", () => {
  it("reads transactions only through the AAL2 Admin API boundary", () => {
    const client = source("src/lib/admin-api/commerce-transactions.ts");

    expect(client).toContain("/api/v1/commerce/transactions?");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("provider_reference_hash");
    expect(client).not.toContain("provider_event_reference_hash");
    expect(client).not.toContain("account_id");
  });

  it("requires commerce.read before rendering financial operations data", () => {
    const page = source("app/commerce/transactions/page.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(page).toContain('activeSlug="commerce"');
    expect(page).toContain('AdminPageState state="forbidden"');
  });

  it("keeps Order Transaction and Provider Event semantics visibly separate", () => {
    const page = source("app/commerce/transactions/page.tsx");

    expect(page).toContain("Order قصد تجاری است");
    expect(page).toContain("Transaction وضعیت مالی نرمال‌شده");
    expect(page).toContain("Provider Event");
    expect(page).toContain("سفارش‌های اخیر");
    expect(page).toContain('title="تراکنش‌ها"');
  });

  it("keeps amountMinor lossless and provider/payment secrets out of the response model", () => {
    const client = source("src/lib/admin-api/commerce-transactions.ts");

    expect(client).toContain("amountMinor: string");
    expect(client).toContain("accountLinked: boolean");
    expect(client).not.toContain("cardNumber");
    expect(client).not.toContain("paymentCredential");
    expect(client).not.toContain("providerReference");
  });

  it("uses server pagination and bounded operational filters", () => {
    const page = source("app/commerce/transactions/page.tsx");

    expect(page).toContain('params.set("page"');
    expect(page).toContain('params.set("pageSize"');
    expect(page).toContain('params.set("product"');
    expect(page).toContain('params.set("provider"');
    expect(page).toContain('params.set("status"');
    expect(page).toContain('params.set("from"');
    expect(page).toContain('params.set("to"');
    expect(page).toContain('params.set("q"');
    expect(page).toContain("data.transactions.total");
  });

  it("has a distinctive responsive RTL and accessible LifeMate visual treatment", () => {
    const page = source("app/commerce/transactions/page.tsx");
    const css = source("app/commerce/transactions/transactions.module.css");

    expect(page).toContain('dir="rtl"');
    expect(page).toContain("AdminDataTable");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 640px");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-violet)");
    expect(css).toContain("var(--lm-orange)");
  });
});
