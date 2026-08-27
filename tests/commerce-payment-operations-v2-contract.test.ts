import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return await readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Commerce payment operations v2", () => {
  it("uses only canonical server-side Core #493 contracts", async () => {
    const client = await source("src/lib/admin-api/commerce-payment-operations-v2.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/refunds?limit=100");
    expect(client).toContain("/api/v1/commerce/reconciliation/cases?limit=100");
    expect(client).toContain("/api/v1/commerce/churn?limit=100");
    expect(client).toContain("/api/v1/commerce/subscriptions/renewal-intent");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("keeps refund and reconciliation mutations explicitly confirmed and idempotent", async () => {
    const actions = await source("app/commerce/operations/actions.ts");
    expect(actions).toContain("confirm-refund-request");
    expect(actions).toContain("confirm-reconciliation-open");
    expect(actions).toContain("confirm-renewal-intent");
    expect(actions).toContain("idempotencyKey");
    expect(actions).toContain("MAX_BIGINT");
    expect(actions).toContain("expectedVersion");
  });

  it("keeps renewal intent separate from refund/reconciliation reason validation", async () => {
    const actions = await source("app/commerce/operations/actions.ts");
    const renewal = actions.slice(actions.indexOf("export async function renewalIntentAction"));
    expect(renewal).toContain("reasonCode");
    expect(renewal).toContain("reasonText");
    expect(renewal).not.toContain("operationReason");
  });

  it("preserves period-end entitlement semantics and provider facts in product copy", async () => {
    const page = await source("app/commerce/operations/page.tsx");
    expect(page).toContain("provider factها append-only");
    expect(page).toContain("entitlement خریداری‌شده را قبل از پایان دوره حذف نمی‌کند");
    expect(page).toContain("هیچ revenue/refund/provider fact از UI استنتاج نمی‌شود");
  });

  it("keeps unavailable/forbidden sections truthful instead of fabricating values", async () => {
    const page = await source("app/commerce/operations/page.tsx");
    expect(page).toContain('state === "forbidden"');
    expect(page).toContain("داده جایگزین ساخته نمی‌شود");
    expect(page).toContain("commerce.refund.request");
    expect(page).toContain("commerce.reconciliation.write");
    expect(page).toContain("commerce.churn.write");
  });

  it("adds the operations workspace to shared Commerce navigation", async () => {
    const header = await source("app/commerce/CommerceWorkspaceHeader.tsx");
    expect(header).toContain('| "operations"');
    expect(header).toContain('href: "/commerce/operations"');
  });
});
