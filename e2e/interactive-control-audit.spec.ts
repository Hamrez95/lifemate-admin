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

const disabledReasonTokens = [
  "unavailable",
  "disabled",
  "permission",
  "در دسترس نیست",
  "غیرفعال",
  "مجوز",
  "endpoint",
] as const;

test(
  "primary routes expose only valid interactive navigation",
  async ({ page }) => {
    test.setTimeout(180_000);
    await signInWithMfa(page);

    const checkedInternalLinks = new Set<string>();

    for (const route of primaryRoutes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 500, route).toBeLessThan(500);
      await expect(page.locator("body"), route).toBeVisible();
      await expect(
        page.locator(invalidHrefSelector),
        `${route}: invalid href`,
      ).toHaveCount(0);

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
        const title = (await button.getAttribute("title"))?.trim();
        const describedBy = (await button.getAttribute("aria-describedby"))?.trim();
        const text = (await button.innerText()).trim().toLowerCase();
        const hasTextReason = disabledReasonTokens.some((token) =>
          text.includes(token),
        );
        expect(
          Boolean(title || describedBy || hasTextReason),
          `${route}: disabled button needs an explicit reason`,
        ).toBe(true);
      }

      const formControls = page.locator(
        "input:visible, select:visible, textarea:visible",
      );
      for (let index = 0; index < (await formControls.count()); index += 1) {
        const control = formControls.nth(index);
        const labelled = await control.evaluate((element) => {
          if (element.getAttribute("aria-label")?.trim()) return true;
          if (element.getAttribute("aria-labelledby")?.trim()) return true;
          if (element.getAttribute("title")?.trim()) return true;
          if (element.closest("label")) return true;
          const id = element.getAttribute("id")?.trim();
          return id
            ? Boolean(document.querySelector(`label[for="${id}"]`))
            : false;
        });
        expect(labelled, `${route}: form control needs an accessible label`).toBe(
          true,
        );
      }

      const hrefs = await page
        .locator("a[href^='/']:visible")
        .evaluateAll((links) =>
          links.flatMap((link) => {
            const href = link.getAttribute("href");
            return href ? [href] : [];
          }),
        );
      for (const href of hrefs) {
        if (checkedInternalLinks.has(href)) continue;
        checkedInternalLinks.add(href);
        const linkResponse = await page.context().request.get(href);
        expect(linkResponse.status(), `${route}: dead link ${href}`).not.toBe(404);
        expect(linkResponse.status(), `${route}: failing link ${href}`).toBeLessThan(
          500,
        );
      }
    }
  },
);
