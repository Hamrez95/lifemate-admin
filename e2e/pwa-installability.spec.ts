import { expect, test } from "@playwright/test";

test("Command Center exposes installable PWA metadata without caching privileged routes", async ({
  page,
}) => {
  await page.goto("/login");

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBe("/manifest.webmanifest");

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    return await response.json();
  });

  expect(manifest.name).toBe("LifeMate Command Center");
  expect(manifest.short_name).toBe("LifeMate Admin");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );

  for (const icon of ["/pwa-icon/192", "/pwa-icon/512", "/pwa-icon/maskable-512"]) {
    const response = await page.request.get(new URL(icon, page.url()).toString());
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }

  const serviceWorker = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return null;
    const registration = await navigator.serviceWorker.ready;
    return {
      scope: registration.scope,
      active: Boolean(registration.active),
      scriptURL: registration.active?.scriptURL ?? null,
    };
  });

  expect(serviceWorker).not.toBeNull();
  expect(serviceWorker?.active).toBe(true);
  expect(serviceWorker?.scriptURL).toContain("/sw.js");

  const cachedUrls = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls: string[] = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      urls.push(...(await cache.keys()).map((request) => request.url));
    }
    return urls;
  });

  expect(cachedUrls.some((url) => new URL(url).pathname === "/login")).toBe(false);
  expect(cachedUrls.some((url) => new URL(url).pathname.startsWith("/api/"))).toBe(false);
  expect(cachedUrls.some((url) => new URL(url).pathname === "/offline")).toBe(true);
});
