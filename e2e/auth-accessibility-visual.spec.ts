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
  await expect(page.getByRole("heading", { name: /ورود امن به مرکز فرماندهی LifeMate/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "ورود", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "ثبت‌نام", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "فعال‌سازی مدیر", exact: true })).toBeVisible();
  await expect(page.getByAltText(/ورود امن و تأیید دومرحله‌ای LifeMate/)).toBeVisible();
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

test("submit is disabled with a spinner while workforce auth is pending", async ({ page }) => {
  let releaseRequest: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route("**/api/auth/workforce", async (route) => {
    await gate;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, code: "authentication_failed" }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("نام کاربری", { exact: true }).fill("staff.test");
  await page.getByLabel("رمز عبور", { exact: true }).fill("qa-password");
  const submit = page.getByRole("button", { name: /ورود با نام کاربری|در حال ورود/ });
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveText(/در حال ورود/);
  releaseRequest?.();
  await expect(page.getByText(/نام کاربری یا رمز عبور صحیح نیست/)).toBeVisible();
});

test("network failure stays fail-closed and shows an accessible error status", async ({ page }) => {
  await page.route("**/api/auth/workforce", (route) => route.abort("internetdisconnected"));
  await page.goto("/login");
  await page.getByLabel("نام کاربری", { exact: true }).fill("staff.test");
  await page.getByLabel("رمز عبور", { exact: true }).fill("qa-password");
  await page.getByRole("button", { name: "ورود با نام کاربری", exact: true }).click();

  const status = page.locator(".auth-message");
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("role", "status");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("body")).not.toContainText("service_role");
});

test("successful pending-role signup reports success without granting access", async ({ page }) => {
  await page.route("**/api/auth/workforce", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, status: "pending_role", access_state: "pending_role" }),
    });
  });

  await page.goto("/login");
  await page.getByRole("tab", { name: "ثبت‌نام", exact: true }).click();
  await page.getByLabel("نام نمایشی").fill("QA Staff");
  await page.getByLabel("نام کاربری").fill("qa.staff");
  await page.getByLabel("رمز عبور", { exact: true }).fill("safe-password");
  await page.getByLabel("تکرار رمز عبور").fill("safe-password");
  await page.getByRole("button", { name: /ثبت‌نام با نام کاربری و رمز عبور/ }).click();

  await expect(page.getByText(/ثبت‌نام انجام شد/)).toBeVisible();
  await expect(page.getByRole("tab", { name: "ورود", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page).toHaveURL(/\/login$/);
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
  await expect(
    page.getByRole("heading", { name: "این بخش در مرکز فرماندهی پیدا نشد." }),
  ).toBeVisible();
  await expect(page.getByText(/هیچ داده‌ای/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("service_role");
  await expectNoViewportOverflow(page);
  await expectNoSeriousA11yViolations(page);
});
