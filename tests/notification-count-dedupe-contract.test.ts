import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function routeSource() {
  return readFile(
    new URL("../app/api/admin/notifications/count/route.ts", import.meta.url),
    "utf8",
  );
}

describe("notification count request dedupe", () => {
  it("scopes short-lived success reuse to a one-way session digest and requested sources", async () => {
    const source = await routeSource();

    expect(source).toContain('request.headers.get("cookie")');
    expect(source).toContain('crypto.subtle.digest("SHA-256"');
    expect(source).toContain("return `${sessionDigest}:${sources}`");
    expect(source).toContain("const SUCCESS_TTL_MS = 10_000");
    expect(source).toContain("const MAX_CACHE_ENTRIES = 256");
    expect(source).not.toContain("successCache.set(cookie");
  });

  it("deduplicates in-flight calls without caching auth or failure responses", async () => {
    const source = await routeSource();

    expect(source).toContain("const inFlight = new Map");
    expect(source).toContain("const pending = inFlight.get(key)");
    expect(source).toContain("if (pending) return pending");
    expect(source).toContain('if (result.kind === "ok") rememberSuccess(key, result)');
    expect(source).not.toMatch(/rememberSuccess\(key, result\)[\s\S]*kind === "forbidden"/);
  });

  it("keeps browser/proxy caching disabled for private notification counts", async () => {
    const source = await routeSource();

    expect(source).toContain('headers: { "Cache-Control": "no-store" }');
    expect(source).not.toContain("unstable_cache");
    expect(source).not.toContain("service_role");
  });
});
