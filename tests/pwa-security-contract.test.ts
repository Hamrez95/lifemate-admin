import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import manifest from "../app/manifest";

describe("Windows Admin PWA contract", () => {
  it("publishes a standalone install manifest with required desktop icons", () => {
    const value = manifest();

    expect(value.name).toBe("LifeMate Command Center");
    expect(value.short_name).toBe("LifeMate Admin");
    expect(value.start_url).toBe("/");
    expect(value.scope).toBe("/");
    expect(value.display).toBe("standalone");
    expect(value.prefer_related_applications).toBe(false);

    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ sizes: "512x512", type: "image/png", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it("keeps authenticated pages and API traffic out of service-worker storage", async () => {
    const source = await readFile("public/sw.js", "utf8");

    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain('fetch(request).catch(() => caches.match("/offline"))');
    expect(source).toContain('"/api/"');
    expect(source).toContain('"/auth/"');
    expect(source).toContain('"/login"');
    expect(source).toContain('"/_next/static/"');
    expect(source).toContain("isSensitiveRequest(url) || !isSafeStaticRequest(url)");
    expect(source).not.toMatch(/SHELL_ASSETS\s*=\s*\[[^\]]*\/login/s);
    expect(source).not.toMatch(/SHELL_ASSETS\s*=\s*\[[^\]]*\/api/s);
  });
});
