import { expect, test, type Page } from "@playwright/test";

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
  `a[href=""]`,
  `a[href="#"]`,
  `a[href^="javascript:"]`,
  `a[href*="/undefined"]`,
  `a[href*="/null"]`,
].join(", ");

const disabledReasonTokens = [
  "unavailable",
  "disabled",
  "permission",
  "در دسترس نیست",
  "غیرفعال",
  "مجوز",
  "endpoint",
] as const;

async function assertNamedControls(page: Page, route: string) {
  const unnamedLinks = page
    .locator("a[href]:visible:not([aria-label]):not([title])")
    .filter({ hasText: /^\s*$/ });
  const unnamedButtons = page
    .locator("button:visible:not([aria-label]):not([title])")
    .filter({ hasText: /^\s*$/ });

  expect(await unnamedLinks.count(), `${route}: unnamed links`).toBe(0);
  expect(await unnamedButtons.count(), `${route}: unnamed buttons`).toBe(0);
}

async function assertDisabledReasons(page: Page, route: string) {
  const buttons = page.locator("button:visible:disabled");
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const title = (await button.getAttribute("title"))?.trim();
    const describedBy = (await button.getAttribute("aria-describedby"))?.trim();
    const text = (await button.innerText()).trim().toLowerCase();
    const hasTextReason = disabledReasonTokens.some((token) => text.includes(token));
    const hasReason = Boolean(title || describedBy || hasTextReason);
    const message = `${route}: disabled button needs an explicit reason`;
    expect(hasReason, message).toBe(true);
  }
}

async function assertLabelledFormControls(page: Page, route: string) {
  const controls = page.locator("input:visible, select:visible, textarea:visible");
  const count = await controls.count();

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const labelled = await control.evaluate((element) => {
      if (element.getAttribute("aria-label")?.trim()) return true;
      if (element.getAttribute("aria-labelledby")?.trim()) return true;
      if (element.getAttribute("title")?.trim()) return true;
      if (element.closest("label")) return true;
      const id = element.getAttribute("id")?.trim();
      if (!id) return false;
      return Boolean(document.querySelector(`label[for="${id}"]`));
    });
    const message = `${route}: form control needs an accessible label`;
    expect(labelled, message).toBe(true);
  }
}

async function assertInternalLinks(page: Page, route: string, checked: Set<string>) {
  const hrefs = await page.locator("a[href^='/']:visible").evaluateAll((links) => {
    return links.flatMap((link) => {
      const href = link.getAttribute("href");
      return href ? [href] : [];
    });
  });

  for (const href of hrefs) {
    if (checked.has(href)) continue;
    checked.add(href);
    const response = await page.context().request.get(href);
    expect(response.status(), `${route}: dead link ${href}`).not.toBe(404);
    expect(response.status(), `${route}: failing link ${href}`).toBeLessThan(500);
  }
}

test("primary routes expose only valid interactive navigation", async ({ page }) => {
  test.setTimeout(180_000);
  await signInWithMfa(page);

  const checkedInternalLinks = new Set<string>();

  for (const route of primaryRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 500, route).toBeLessThan(500);
    await expect(page.locator("body"), route).toBeVisible();
    await expect(page.locator(invalidHrefSelector)).toHaveCount(0);
    await assertNamedControls(page, route);
    await assertDisabledReasons(page, route);
    await assertLabelledFormControls(page, route);
    await assertInternalLinks(page, route, checkedInternalLinks);
  }
});
