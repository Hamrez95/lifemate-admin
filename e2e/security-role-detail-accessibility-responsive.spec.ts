import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signInWithMfa(page: Page) {
  await page.goto("/login");
  await page.getByLabel("شماره موبایل حساب LifeMate").fill("09121234567");
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await page.getByLabel("کد پیامک").fill("123456");
  await page.getByRole("button", { name: "تأیید کد" }).click();
  await page.getByLabel("کد Authenticator").fill("654321");
  await page.getByRole("button", { name: "ورود امن" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(
    a11y.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

test("role detail keeps memberships traceable, elevated access blocked, accessible, and responsive", async ({
  page,
}) => {
  await signInWithMfa(page);
  await page.goto("/security/roles/security");

  await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
  await expect(page.getByText("LifeMate admin RBAC control plane")).toBeVisible();
  await expect(page.getByText("مرز دسترسی ویژه حفظ شده است")).toBeVisible();
  await expect(page.getByText("health.read.elevated")).toBeVisible();
  await expect(page.getByText("خارج از نقش عادی", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /ویرایش|ذخیره|افزودن|دعوت|لغو/ })).toHaveCount(0);

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) > 700) {
    const table = page.getByRole("region", {
      name: /جدول عضویت‌های نقش؛ برای ستون‌های بیشتر اسکرول افقی کنید/,
    });
    await expect(table).toBeVisible();
    await expect(table.getByText("66666666-6666-4666-8666-666666666666")).toBeVisible();
    await table.focus();
    await expect(table).toBeFocused();

    const permissionDetails = table.locator("details").filter({ hasText: "۳ مورد" });
    await permissionDetails.locator("summary").click();
    await expect(permissionDetails.getByText("security.audit.read", { exact: true })).toBeVisible();
    await expect(permissionDetails.getByText("از نقش: security", { exact: true })).toBeVisible();
  } else {
    const mobile = page.getByLabel("خلاصه موبایل عضویت‌های نقش");
    await expect(mobile).toBeVisible();
    await expect(mobile.getByText("66666666-6666-4666-8666-666666666666")).toBeVisible();
    await expect(mobile).toContainText("فعال");
    await expect(mobile).toContainText("لغوشده");
  }

  await expectNoViewportOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
