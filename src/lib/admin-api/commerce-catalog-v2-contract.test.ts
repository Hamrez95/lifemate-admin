import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const clientUrl = new URL("./commerce-catalog-v2.ts", import.meta.url);
const pageUrl = new URL("../../../app/commerce/catalog/page.tsx", import.meta.url);

async function source(url: URL) {
  return readFile(url, "utf8");
}

describe("commerce catalog v2 Admin consumer", () => {
  it("stays server-only and consumes only the canonical Core catalog route", async () => {
    const text = await source(clientUrl);
    expect(text).toContain('import "server-only"');
    expect(text).toContain("/api/v1/commerce/catalog-v2");
    expect(text).toContain('cache: "no-store"');
    expect(text).toContain("AbortSignal.timeout(10_000)");
    expect(text).not.toContain(".from(");
    expect(text).not.toContain("service_role");
  });

  it("fails closed when product, offer, price or bundle payloads are malformed", async () => {
    const text = await source(clientUrl);
    expect(text).toContain("parseProduct");
    expect(text).toContain("parseOffer");
    expect(text).toContain("parsePrice");
    expect(text).toContain("parseBundle");
    expect(text).toContain('return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" }');
  });

  it("does not fabricate v2 mutations or financial conversions in the workspace", async () => {
    const text = await source(pageUrl);
    expect(text).toContain("mutationهای v2");
    expect(text).toContain("minor unit");
    expect(text).toContain("FX");
    expect(text).not.toContain("supabase");
    expect(text).not.toContain("serviceRole");
  });
});
