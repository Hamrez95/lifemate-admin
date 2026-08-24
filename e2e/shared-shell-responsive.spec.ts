import { expect, test, type Page } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "compact-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

for (const viewport of viewports) {
  test(`shared RTL shell is stable at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signInWithMfa(page);
    await expect(page).toHaveURL(/\/$/);

    await expect(page.getByLabel("ناوبری اصلی Command Center")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "مسیر صفحه" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expectNoViewportOverflow(page);

    const shellDirection = await page
      .locator(".app-shell")
      .evaluate((element) => getComputedStyle(element).direction);
    expect(shellDirection).toBe("rtl");

    const sidebar = page.getByLabel("ناوبری اصلی Command Center");
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();

    if (viewport.width === 390) {
      const position = await sidebar.evaluate((element) => getComputedStyle(element).position);
      expect(position).toBe("fixed");
      expect(box!.width).toBeGreaterThanOrEqual(380);
    } else if (viewport.width === 768) {
      expect(box!.width).toBeGreaterThanOrEqual(70);
      expect(box!.width).toBeLessThanOrEqual(74);
    } else if (viewport.width === 1024) {
      expect(box!.width).toBeGreaterThanOrEqual(205);
      expect(box!.width).toBeLessThanOrEqual(215);
    } else {
      expect(box!.width).toBeGreaterThanOrEqual(230);
      expect(box!.width).toBeLessThanOrEqual(242);
    }
  });
}
