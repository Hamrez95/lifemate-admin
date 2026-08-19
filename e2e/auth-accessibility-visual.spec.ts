import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test("protected Command Center redirects an unauthenticated browser to workforce login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /خوش آمدید/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "ورود" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ثبت‌نام" })).toBeVisible();
  await expect(page.getByRole("button", { name: "فعال‌سازی مدیر" })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "ورود با نام کاربری" })).toBeEnabled();

  await page.getByRole("button", { name: "ثبت‌نام" }).click();
  await expect(page.getByLabel("نام نمایشی")).toBeVisible();
  await expect(page.getByLabel("تکرار رمز عبور")).toBeVisible();
  await expect(page.getByText(/هیچ دسترسی مدیریتی/)).toBeVisible();

  await page.keyboard.press("Shift+Tab");
  await expectNoSeriousA11yViolations(page);
});

test("forbidden state explains server-side authorization without leaking backend details", async ({
  page,
}) => {
  await page.goto("/forbidden");
  await expect(
    page.getByRole("heading", { name: "این حساب برای این بخش مجوز ندارد." }),
  ).toBeVisible();
  await expect(
    page.getByText(/permissionهای Command Center در سمت سرور بررسی می‌شوند/),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("service_role");
  await expect(page.locator("body")).not.toContainText("DATABASE_URL");
  await expectNoSeriousA11yViolations(page);
  await expect(page).toHaveScreenshot("forbidden-state.png", { fullPage: true });
});
