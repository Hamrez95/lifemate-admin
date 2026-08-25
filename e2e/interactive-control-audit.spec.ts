import { expect, test } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

const primaryRoutes = [
  "/",
  "/users",
  "/analytics",
  "/analytics/funnel",
  "/analytics/cohorts",
  "/relationships",
  "/relationships/ledger",
  "/support",
  "/commerce",
  "/commerce/plans",
  "/commerce/entitlements",
  "/commerce/promotions",
  "/commerce/subscriptions",
  "/commerce/transactions",
  "/commerce/revenue",
  "/marketing",
  "/marketing/campaigns",
  "/marketing/channels",
  "/marketing/content-calendar",
  "/marketing/content-studio",
  "/finance",
  "/finance/budget",
  "/finance/cash",
  "/finance/scenario",
  "/operations",
  "/security",
  "/security/audit",
  "/ai",
  "/ai/daily-brief",
  "/settings",
  "/profile",
] as const;

const invalidHrefSelector = [
  'a[href=""]',
  'a[href="#"]',
  'a[href^="javascript:"]',
  'a[href*="/undefined"]',
  'a[href*="/null"]',
].join(", ");

test("primary routes expose only valid interactive navigation", async ({ page }) => {
  test.setTimeout(120_000);
  await signInWithMfa(page);

  for (const route of primaryRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 500, route).toBeLessThan(500);
    await expect(page.locator("body"), route).toBeVisible();
    await expect(page.locator(invalidHrefSelector), `${route}: invalid href`).toHaveCount(0);

    const unnamedLinks = page
      .locator('a[href]:visible:not([aria-label]):not([title])')
      .filter({ hasText: /^\s*$/ });
    const unnamedButtons = page
      .locator('button:visible:not([aria-label]):not([title])')
      .filter({ hasText: /^\s*$/ });
    expect(await unnamedLinks.count(), `${route}: unnamed links`).toBe(0);
    expect(await unnamedButtons.count(), `${route}: unnamed buttons`).toBe(0);
  }
});
