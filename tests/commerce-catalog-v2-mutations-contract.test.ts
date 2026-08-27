import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return await readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Commerce Catalog v2 mutation controls", () => {
  it("keeps Catalog reads and writes server-only and canonical", async () => {
    const client = await source("src/lib/admin-api/commerce-catalog-v2.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/catalog-v2");
    expect(client).toContain('"Idempotency-Key"');
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("preserves optimistic product/offer/bundle/policy versions from Core #560", async () => {
    const client = await source("src/lib/admin-api/commerce-catalog-v2.ts");
    const actions = await source("app/commerce/catalog/actions.ts");
    expect(client).toContain("version: number;");
    expect(actions).toContain("expectedVersion");
    expect(actions).toContain("/api/v1/commerce/catalog-v2/products/");
    expect(actions).toContain("/api/v1/commerce/catalog-v2/offers/");
    expect(actions).toContain("/api/v1/commerce/catalog-v2/bundles/");
    expect(actions).toContain("/policies/");
  });

  it("does not infer price or bypass Core audit semantics", async () => {
    const actions = await source("app/commerce/catalog/actions.ts");
    const page = await source("app/commerce/catalog/page.tsx");
    expect(actions).toContain("amountMinor");
    expect(actions).toContain("currency");
    expect(actions).toContain("storeProvider");
    expect(actions).toContain("reason");
    expect(page).toContain("commerce.catalog.write");
    expect(page).toContain("Core #560");
    expect(page).not.toContain("direct database");
  });

  it("supports Product Offer Price Bundle and typed Policy controls", async () => {
    const controls = await source("app/commerce/catalog/CatalogMutationControls.tsx");
    expect(controls).toContain("updateProductAction");
    expect(controls).toContain("createOfferAction");
    expect(controls).toContain("updateOfferAction");
    expect(controls).toContain("schedulePriceAction");
    expect(controls).toContain("createBundleAction");
    expect(controls).toContain("updateBundleAction");
    expect(controls).toContain("upsertPolicyAction");
  });
});
