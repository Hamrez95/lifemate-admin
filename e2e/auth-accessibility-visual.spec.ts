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
  await expect(page.getByText(/تأیید دومرحله‌ای AAL2 اجباری است/)).toBeVisible();
});

test("login is Persian RTL, keyboard reachable, validates locally and remains accessible", async ({
  page,
}) => {
  await page.goto("/login");
  const email = page.getByLabel("ایمیل حساب LifeMate");
  const password = page.getByLabel("رمز عبور LifeMate");
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  await page.keyboard.press("Tab");
  await expect(email).toBeFocused();
  await email.fill("not-an-email");
  await password.fill("x");
  await page.getByRole("button", { name: "ادامه ورود امن" }).click();
  await expect(page.getByText(/ایمیل و رمز عبور حساب موجود LifeMate را وارد کنید/)).toBeVisible();
  await expect(page.getByText(/حساب جدید از Command Center ساخته نمی‌شود/)).toBeVisible();

  await expectNoSeriousA11yViolations(page);
  await expect(page).toHaveScreenshot("secure-login.png", { fullPage: true });
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
