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
  `a[href=""]`,
  `a[href="#"]`,
  `a[href^="javascript:"]`,
  `a[href*="/undefined"]`,
  `a[href*="/null"]`,
].join(", ");

function isSameOriginHttpLink(rawHref: string, origin: string): boolean {
  try {
    const url = new URL(rawHref, origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}

test("primary routes expose only valid interactive controls and navigation", async ({ page }) => {
  test.setTimeout(180_000);
  await signInWithMfa(page);

  const origin = new URL(page.url()).origin;
  const checkedInternalLinks = new Set<string>();

  for (const route of primaryRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 500, route).toBeLessThan(500);
    await expect(page.locator("body"), route).toBeVisible();
    await expect(page.locator(invalidHrefSelector), `${route}: invalid href`).toHaveCount(0);

    const unnamedLinks = page
      .locator("a[href]:visible:not([aria-label]):not([title])")
      .filter({ hasText: /^\s*$/ });
    const unnamedButtons = page
      .locator("button:visible:not([aria-label]):not([title])")
      .filter({ hasText: /^\s*$/ });
    expect(await unnamedLinks.count(), `${route}: unnamed links`).toBe(0);
    expect(await unnamedButtons.count(), `${route}: unnamed buttons`).toBe(0);

    const disabledButtons = page.locator("button:visible:disabled");
    for (let index = 0; index < (await disabledButtons.count()); index += 1) {
      const button = disabledButtons.nth(index);
      const hasReason = await button.evaluate((element) => {
        const title = element.getAttribute("title")?.trim();
        const describedBy = element.getAttribute("aria-describedby")?.trim();
        if (title || describedBy) return true;

        const text = element.textContent?.trim().toLowerCase() ?? "";
        return [
          "unavailable",
          "disabled",
          "permission",
          "در دسترس نیست",
          "غیرفعال",
          "مجوز",
          "endpoint",
        ].some((token) => text.includes(token));
      });
      expect(
        hasReason,
        `${route}: disabled button without dependency/permission reason`,
      ).toBe(true);
    }

    const formControls = page.locator(
      "input:visible, select:visible, textarea:visible",
    );
    for (let index = 0; index < (await formControls.count()); index += 1) {
      const control = formControls.nth(index);
      const hasAccessibleLabel = await control.evaluate((element) => {
        const ariaLabel = element.getAttribute("aria-label")?.trim();
        const ariaLabelledBy = element.getAttribute("aria-labelledby")?.trim();
        const title = element.getAttribute("title")?.trim();
        const id = element.getAttribute("id")?.trim();
        if (ariaLabel || ariaLabelledBy || title) return true;
        if (!id) return Boolean(element.closest("label"));
        return Boolean(
          element.closest("label") ||
            document.querySelector(`label[for="${CSS.escape(id)}"]`),
        );
      });
      expect(
        hasAccessibleLabel,
        `${route}: visible form control without accessible label`,
      ).toBe(true);
    }

    const hrefs = await page.locator("a[href]:visible").evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .filter((href): href is string => Boolean(href)),
    );

    for (const href of hrefs) {
      if (!isSameOriginHttpLink(href, origin)) continue;
      const url = new URL(href, origin);
      url.hash = "";
      const normalized = url.toString();
      if (checkedInternalLinks.has(normalized)) continue;
      checkedInternalLinks.add(normalized);

      const linkResponse = await page.context().request.get(normalized, {
        maxRedirects: 5,
      });
      expect(
        linkResponse.status(),
        `${route}: dead internal link ${url.pathname}`,
      ).not.toBe(404);
      expect(
        linkResponse.status(),
        `${route}: failing internal link ${url.pathname}`,
      ).toBeLessThan(500);
    }
  }
});
