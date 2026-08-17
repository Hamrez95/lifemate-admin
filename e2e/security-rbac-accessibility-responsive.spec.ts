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

test("security RBAC matrix is read-only, explicit about elevated access, accessible, and responsive", async ({
  page,
}) => {
  await signInWithMfa(page);
  await page.goto("/security");

  await expect(page.getByRole("heading", { name: "ماتریس نقش و مجوز" })).toBeVisible();
  await expect(page.getByText("LifeMate admin RBAC control plane")).toBeVisible();
  await expect(page.getByText("مرز Break-glass حفظ می‌شود")).toBeVisible();
  await expect(
    page.getByLabel("خلاصه تنظیمات RBAC").getByText("خارج از نقش عادی", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /ویرایش|ذخیره|دعوت/ })).toHaveCount(0);

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) > 700) {
    const matrix = page.getByRole("region", {
      name: /ماتریس نقش و مجوز؛ برای مشاهده ستون‌های بیشتر اسکرول افقی کنید/,
    });
    await expect(matrix).toBeVisible();
    await expect(page.getByRole("row", { name: /health\.read\.elevated/ })).toContainText("ویژه");
    await expect(page.getByRole("row", { name: /security\.audit\.read/ })).toContainText("دارد");
    await matrix.focus();
    await expect(matrix).toBeFocused();
  } else {
    const mobileRoles = page.getByLabel("خلاصه موبایل نقش‌ها");
    await expect(mobileRoles).toBeVisible();
    await expect(mobileRoles).toContainText("Security");
    await expect(mobileRoles).toContainText("security.audit.read");
  }

  await expectNoViewportOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByLabel("جست‌وجو").fill("health.read.elevated");
  await page.getByLabel("ریسک").selectOption("ELEVATED");
  await page.getByRole("button", { name: "اعمال فیلتر" }).click();
  await expect(page).toHaveURL(/\/security\?/);
  const filteredUrl = new URL(page.url());
  expect(filteredUrl.searchParams.get("q")).toBe("health.read.elevated");
  expect(filteredUrl.searchParams.get("risk")).toBe("ELEVATED");
  await expect(page.getByText(/۱ permission از ۵ مورد نمایش داده می‌شود/)).toBeVisible();
  await expectNoViewportOverflow(page);
});
