import { expect, test, type Page } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

test("login stays usable without horizontal overflow", async ({ page }) => {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 500).toBeLessThan(500);
  await expect(
    page.getByRole("heading", { name: "ورود امن به مرکز فرماندهی LifeMate" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "ورود با نام کاربری" })).toBeVisible();
  await expectNoViewportOverflow(page);
});

test("core authenticated routes stay responsive and fail closed", async ({ page }) => {
  await signInWithMfa(page);

  const routes = ["/", "/users", "/relationships", "/commerce", "/security/audit"] as const;

  for (const path of routes) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 500, path).toBeLessThan(500);
    await expect(page.getByRole("main")).toBeVisible();
    await expectNoViewportOverflow(page);
  }
});
