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

test("protected Command Center redirects an unauthenticated browser to invite-only workforce login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: /ورود امن به مرکز فرماندهی LifeMate/ }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "ورود کارکنان", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "فعال‌سازی Founder", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "ثبت‌نام", exact: true })).toHaveCount(0);
  await expect(page.getByText(/ثبت‌نام عمومی ندارد/)).toBeVisible();
  await expect(page.getByAltText(/ورود امن و تأیید دومرحله‌ای LifeMate/)).toHaveCount(1);
  await expectNoViewportOverflow(page);
});

test("invite-only login is Persian RTL, keyboard reachable and accessible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const username = page.getByLabel("نام کاربری", { exact: true });
  const password = page.getByLabel("رمز عبور", { exact: true });
  await expect(username).toBeVisible();
  await expect(password).toBeVisible();
  await username.fill("staff.test");
  await password.fill("qa-password");
  await expect(
    page.getByRole("button", { name: "ادامه به تأیید دومرحله‌ای", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText(/فقط هویت‌های دعوت‌شده/)).toBeVisible();

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
  const submit = page.getByRole("button", { name: /ادامه به تأیید دومرحله‌ای|در حال ورود/ });
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
  await page
    .getByRole("button", { name: "ادامه به تأیید دومرحله‌ای", exact: true })
    .click();

  const status = page.locator(".auth-message");
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("role", "status");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("body")).not.toContainText("service_role");
});

test("Founder activation is one-time and still routes to MFA rather than granting direct access", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("tab", { name: "فعال‌سازی Founder", exact: true }).click();
  await expect(page.getByLabel("نام کاربری Founder")).toBeVisible();
  await expect(page.getByLabel("رمز عبور اولیه")).toBeVisible();
  await expect(page.getByLabel("کد فعال‌سازی یک‌بارمصرف")).toBeVisible();
  await expect(page.getByText(/بدون TOTP\/AAL2 دسترسی مدیریتی ایجاد نمی‌کند/)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
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
  await expect(
    page.getByRole("heading", { name: "این بخش در مرکز فرماندهی پیدا نشد." }),
  ).toBeVisible();
  await expect(page.getByText(/هیچ داده‌ای/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("service_role");
  await expectNoViewportOverflow(page);
  await expectNoSeriousA11yViolations(page);
});
