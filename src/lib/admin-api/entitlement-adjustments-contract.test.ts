import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const sourceUrl = new URL("./entitlement-adjustments.ts", import.meta.url);

async function source() {
  return readFile(sourceUrl, "utf8");
}

describe("manual entitlement adjustment Admin client", () => {
  it("stays server-only and uses only canonical Admin API routes", async () => {
    const text = await source();
    expect(text).toContain('import "server-only"');
    expect(text).toContain("/api/v1/commerce/entitlement-adjustments/preview");
    expect(text).toContain("/api/v1/commerce/entitlement-adjustments/requests");
    expect(text).toContain("/api/v1/commerce/entitlement-adjustments/execute");
    expect(text).toContain("/api/v1/commerce/accounts/${accountId}/entitlement-adjustments");
    expect(text).toContain('cache: "no-store"');
    expect(text).toContain("Idempotency-Key");
    expect(text).not.toContain(".from(");
    expect(text).not.toContain("service_role");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE");
  });

  it("fails closed when canonical history payloads are malformed", async () => {
    const text = await source();
    expect(text).toContain("UUID_PATTERN");
    expect(text).toContain("historyItem");
    expect(text).toContain("items.some((item) => item === null)");
    expect(text).toContain('return { kind: "unavailable" }');
  });
});
