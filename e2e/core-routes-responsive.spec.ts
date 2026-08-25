import { expect, test, type Page } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

test("login stays usable without horizontal overflow", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status() ?? 500).toBeLessThan(500);
  await expect(
    page.getByRole("heading", { name: "ورود امن به مرکز فرماندهی LifeMate" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "ورود با نام کاربری" })).toBeVisible();
  await expectNoViewportOverflow(page);
});

test("core authenticated routes stay responsive and fail closed", async ({ page }) => {
  await signInWithMfa(page);

  const routes = [
    { path: "/", marker: "مرکز فرماندهی" },
    { path: "/users", marker: "کاربران و حساب‌ها" },
    { path: "/relationships", marker: "روابط، دسترسی و رضایت" },
    { path: "/commerce", marker: "فروش و تجارت" },
    { path: "/security/audit", marker: "گزارش ممیزی" },
  ] as const;

  for (const route of routes) {
    const response = await page.goto(route.path);
    expect(response?.status() ?? 500, route.path).toBeLessThan(500);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByText(route.marker, { exact: false }).first()).toBeVisible();
    await expectNoViewportOverflow(page);
  }
});
