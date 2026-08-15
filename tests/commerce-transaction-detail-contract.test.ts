import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-COM-004 Transaction Detail / Audited Financial Actions", () => {
  it("keeps detail reads and financial workflow mutations behind the server Admin API", () => {
    const client = source("src/lib/admin-api/commerce-transaction-detail.ts");

    expect(client).toContain("/api/v1/commerce/transactions/${transactionId}");
    expect(client).toContain("/actions/refund-request");
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain('method: "POST"');
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("provider_reference_hash");
    expect(client).not.toContain("provider_event_reference_hash");
    expect(client).not.toContain("account_id");
  });

  it("keeps money and identity browser contracts lossless and privacy-minimized", () => {
    const client = source("src/lib/admin-api/commerce-transaction-detail.ts");

    expect(client).toContain("amountMinor: string");
    expect(client).toContain("accountLinked: boolean");
    expect(client).toContain('providerActionExecuted: false');
    expect(client).not.toContain("cardNumber");
    expect(client).not.toContain("paymentCredential");
    expect(client).not.toContain("providerReference");
  });

  it("separates read, refund, and audit permissions", () => {
    const page = source("app/commerce/transactions/[transactionId]/page.tsx");
    const operation = source("app/commerce/transactions/[transactionId]/RefundOperation.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(operation).toContain("commerce.refund");
    expect(page).toContain("security.audit.read");
    expect(operation).toContain("High risk · commerce.refund");
  });

  it("makes the only financial action an idempotent human-review refund request", () => {
    const actions = source("app/commerce/transactions/[transactionId]/actions.ts");
    const operation = source("app/commerce/transactions/[transactionId]/RefundOperation.tsx");
    const client = source("src/lib/admin-api/commerce-transaction-detail.ts");

    expect(actions).toContain("requestCommerceRefundWorkflow");
    expect(actions).toContain("reason.length < 10");
    expect(actions).toContain("idempotencyKey");
    expect(operation).toContain('name="idempotencyKey"');
    expect(operation).toContain("crypto.randomUUID()");
    expect(operation).toContain("PendingReview");
    expect(operation).toContain("هیچ بازپرداختی در درگاه اجرا نمی‌کند");
    expect(client).toContain('body.workflow !== "HumanReview"');
    expect(client).toContain("body.providerActionExecuted !== false");
  });

  it("keeps Order Transaction and Provider Event semantics visibly distinct", () => {
    const page = source("app/commerce/transactions/[transactionId]/page.tsx");

    expect(page).toContain("Order ≠ Transaction");
    expect(page).toContain("Provider Event به‌تنهایی وضعیت نهایی Transaction نیست");
    expect(page).toContain("Normalized financial state");
    expect(page).toContain("Subscription context");
  });

  it("renders explicit operational states and scoped audit evidence", () => {
    const page = source("app/commerce/transactions/[transactionId]/page.tsx");

    expect(page).toContain('AdminPageState state="forbidden"');
    expect(page).toContain('state="empty"');
    expect(page).toContain('state="error"');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain('evidence.state === "forbidden"');
    expect(page).toContain("شناسه حساب عامل نمایش داده نمی‌شود");
    expect(page).toContain("data.freshness.asOfUtc");
  });

  it("is reachable from every transaction row", () => {
    const list = source("app/commerce/transactions/page.tsx");

    expect(list).toContain("/commerce/transactions/${row.transactionId}");
    expect(list).toContain('header: "جزئیات"');
    expect(list).toContain("مشاهده جزئیات تراکنش");
  });

  it("keeps Persian RTL visuals responsive, keyboard-visible and motion-aware", () => {
    const page = source("app/commerce/transactions/[transactionId]/page.tsx");
    const css = source(
      "app/commerce/transactions/[transactionId]/transaction-detail.module.css",
    );

    expect(page).toContain('dir="rtl"');
    expect(page).toContain('aria-labelledby="provider-timeline-title"');
    expect(page).toContain('aria-labelledby="refund-title"');
    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-orange-soft)");
    expect(css).toContain("var(--lm-violet-soft)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 640px");
    expect(css).toContain("prefers-reduced-motion");
  });
});
