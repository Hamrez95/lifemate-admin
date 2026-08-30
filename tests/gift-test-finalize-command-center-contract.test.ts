import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return await readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("LifeMate Gift Subscription #624 · Command Center Test Finalize", () => {
  it("calls only the canonical Core endpoint from a server-only client", async () => {
    const client = await source("src/lib/admin-api/commerce-gift-test-finalize.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/gifts/test-finalize");
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("whitelists the gift test payload and never sends a raw claim token", async () => {
    const client = await source("src/lib/admin-api/commerce-gift-test-finalize.ts");
    expect(client).toContain("giftIntentId: input.giftIntentId");
    expect(client).toContain("transactionId: input.transactionId");
    expect(client).toContain("claimTokenHash: input.claimTokenHash");
    expect(client).toContain("claimTtlHours: input.claimTtlHours");
    expect(client).not.toMatch(/\bclaimToken\s*:/);
    expect(client).not.toMatch(/input\.claimToken\b/);
  });

  it("uses a unique idempotency key that survives retries and rotates only after success", async () => {
    const controls = await source("app/commerce/operations/PaymentOperationsControls.tsx");
    const client = await source("src/lib/admin-api/commerce-gift-test-finalize.ts");
    expect(controls).toContain("crypto.randomUUID()");
    expect(controls).toContain('useIdempotencyInput("gift-test-finalize", state)');
    expect(controls).toContain('state.status === "success"');
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
  });

  it("accepts only a hash in UI and validates the exact Core bounds server-side", async () => {
    const controls = await source("app/commerce/operations/PaymentOperationsControls.tsx");
    const actions = await source("app/commerce/operations/actions.ts");
    expect(controls).toContain('name="claimTokenHash"');
    expect(controls).not.toContain('name="claimToken"');
    expect(controls).toContain("raw claim token نباید در Command Center وارد، ذخیره یا لاگ شود");
    expect(actions).toContain("CLAIM_TOKEN_HASH = /^[0-9a-f]{64,128}$/");
    expect(actions).toContain("claimTtlHours < 1 || claimTtlHours > 720");
    expect(actions).toContain("confirm-gift-test-finalize");
  });

  it("uses the existing high-risk entitlement permission without a Founder bypass", async () => {
    const page = await source("app/commerce/operations/page.tsx");
    const client = await source("src/lib/admin-api/commerce-gift-test-finalize.ts");
    expect(page).toContain('admin.permissions.includes("commerce.entitlement.adjust.execute")');
    expect(page).toContain("requireAdminAccess()");
    expect(client).not.toMatch(/founder/i);
    expect(client).not.toMatch(/bypass/i);
  });

  it("does not place relationship, consent or sensitive-health concepts in the API payload", async () => {
    const client = await source("src/lib/admin-api/commerce-gift-test-finalize.ts");
    for (const forbidden of [
      "relationship",
      "consent",
      "healthPermission",
      "womenHealth",
      "period",
      "pregnancy",
    ]) {
      expect(client).not.toContain(forbidden);
    }
  });
});
