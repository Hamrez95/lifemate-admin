import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

test("protected Command Center redirects an unauthenticated browser to workforce login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /خوش آمدید/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "ورود", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "ثبت‌نام", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "فعال‌سازی مدیر", exact: true })).toBeVisible();
});

test("login and pending staff signup are Persian RTL, keyboard reachable and accessible", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const username = page.getByLabel("نام کاربری", { exact: true });
  const password = page.getByLabel("رمز عبور", { exact: true });
  await expect(username).toBeVisible();
  await expect(password).toBeVisible();
  await username.fill("staff.test");
  await password.fill("qa-password");
  await expect(page.getByRole("button", { name: "ورود با نام کاربری", exact: true })).toBeEnabled();

  await page.getByRole("tab", { name: "ثبت‌نام", exact: true }).click();
  await expect(page.getByLabel("نام نمایشی")).toBeVisible();
  await expect(page.getByLabel("تکرار رمز عبور")).toBeVisible();
  await expect(page.getByText(/هیچ دسترسی مدیریتی/)).toBeVisible();

  await page.keyboard.press("Shift+Tab");
  await expectNoSeriousA11yViolations(page);
});

test("forbidden state explains server authorization, stays keyboard reachable, and does not overflow", async ({
  page,
}) => {
  await page.goto("/forbidden");
  await expect(page.getByRole("heading", { name: "برای این بخش دسترسی ندارید." })).toBeVisible();
  await expect(page.getByText(/عضویت فعال، سطح دسترسی لازم/)).toBeVisible();
  await expect(page.getByText(/سمت سرور/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("service_role");
  await expect(page.locator("body")).not.toContainText("DATABASE_URL");

  const homeLink = page.getByRole("link", { name: "بازگشت به مرکز فرماندهی" });
  await homeLink.focus();
  await expect(homeLink).toBeFocused();
  await expectNoViewportOverflow(page);
  await expectNoSeriousA11yViolations(page);
});

test("not-found state is truthful, responsive, and accessible", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByRole("heading", { name: "این بخش در مرکز فرماندهی پیدا نشد." })).toBeVisible();
  await expect(page.getByText(/هیچ داده‌ای/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("service_role");
  await expectNoViewportOverflow(page);
  await expectNoSeriousA11yViolations(page);
});
