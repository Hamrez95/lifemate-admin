import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test("protected Command Center redirects an unauthenticated browser to secure login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "ورود امن به مرکز فرماندهی" })).toBeVisible();
  await expect(page.getByText("تأیید دومرحله‌ای AAL2 اجباری است.")).toBeVisible();
});

test("login is Persian RTL, keyboard reachable, validates locally and remains accessible", async ({
  page,
}) => {
  await page.goto("/login");
  const phone = page.getByLabel("شماره موبایل حساب LifeMate");
  await expect(phone).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  await page.keyboard.press("Tab");
  await expect(phone).toBeFocused();
  await phone.fill("123");
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(page.getByText(/شماره موبایل را با فرمت معتبر وارد کنید/)).toBeVisible();
  await expect(page.getByText(/ورود حساب جدید از این صفحه ساخته نمی‌شود/)).toBeVisible();

  await expectNoSeriousA11yViolations(page);
  await expect(page).toHaveScreenshot("secure-login.png", { fullPage: true });
});

test("forbidden state explains server-side authorization without leaking backend details", async ({
  page,
}) => {
  await page.goto("/forbidden");
  await expect(page.getByRole("heading", { name: "این حساب برای این بخش مجوز ندارد." })).toBeVisible();
  await expect(page.getByText(/permissionهای Command Center در سمت سرور بررسی می‌شوند/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("service_role");
  await expect(page.locator("body")).not.toContainText("DATABASE_URL");
  await expectNoSeriousA11yViolations(page);
  await expect(page).toHaveScreenshot("forbidden-state.png", { fullPage: true });
});
