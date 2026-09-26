import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

const presentationModes = [
  { name: "rtl-light", direction: "rtl", theme: "light" },
  { name: "rtl-dark", direction: "rtl", theme: "dark" },
  { name: "ltr-light", direction: "ltr", theme: "light" },
  { name: "ltr-dark", direction: "ltr", theme: "dark" },
] as const;

const representativeRoutes = [
  "/",
  "/users",
  "/analytics",
  "/support",
  "/commerce",
  "/marketing",
  "/finance",
  "/operations",
  "/security/audit",
  "/profile",
  "/settings",
] as const;

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

async function setPresentation(page: Page, direction: string, theme: string) {
  await page.evaluate(
    ({ direction: nextDirection, theme: nextTheme }) => {
      localStorage.setItem("lifemate-command-center-direction", nextDirection);
      localStorage.setItem("lifemate-command-center-appearance", nextTheme);
    },
    { direction, theme },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("dir", direction);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

async function expectNoSeriousA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test.describe("ADM-QA-001 dual-theme RTL/LTR regression matrix", () => {
  test("representative authenticated routes remain usable across all presentation modes", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signInWithMfa(page);

    for (const presentation of presentationModes) {
      await setPresentation(page, presentation.direction, presentation.theme);

      for (const route of representativeRoutes) {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.status() ?? 500, `${presentation.name} ${route}`).toBeLessThan(500);
        await expect(page.getByRole("main"), `${presentation.name} ${route}`).toBeVisible();
        await expectNoViewportOverflow(page);

        const shellDirection = await page
          .locator(".app-shell")
          .evaluate((element) => getComputedStyle(element).direction);
        expect(shellDirection, `${presentation.name} ${route}`).toBe(presentation.direction);

        if (route === "/" || route === "/profile") {
          await expectNoSeriousA11yViolations(page);
        }
      }
    }
  });
});
