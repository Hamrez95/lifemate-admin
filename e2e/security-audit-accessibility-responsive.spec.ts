import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

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

test("audit explorer is permission-discoverable, fail-closed, accessible, and responsive", async ({
  page,
}) => {
  await signInWithMfa(page);
  await page.goto("/security");

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) > 900) {
    const auditLink = page.getByRole("link", { name: "گزارش ممیزی" });
    await expect(auditLink).toBeVisible();
    await auditLink.focus();
    await expect(auditLink).toBeFocused();
    await auditLink.click();
  } else {
    await page.goto("/security/audit");
  }

  await expect(page).toHaveURL(/\/security\/audit$/);
  await expect(page.getByRole("heading", { name: "Audit Log Explorer" })).toBeVisible();
  await expect(page.getByText("مرز فعلی API")).toBeVisible();
  await expect(page.getByText(/فیلتر تاریخ و pagination پایدار/)).toBeVisible();

  // The QA mock intentionally has no audit endpoint yet. The product must therefore
  // render a truthful unavailable state instead of inventing operator events.
  await expect(page.getByText("گزارش ممیزی در دسترس نیست.")).toBeVisible();
  await expect(page.getByText("هیچ رویداد فرضی نمایش داده نمی‌شود.")).toBeVisible();
  await expect(page.getByRole("button", { name: /ویرایش|حذف|دعوت|ذخیره/ })).toHaveCount(0);

  const limit = page.getByLabel("تعداد رویدادهای اخیر");
  await expect(limit).toHaveValue("50");
  await limit.selectOption("25");
  await page.getByRole("button", { name: "به‌روزرسانی نما" }).click();
  await expect(page).toHaveURL(/\/security\/audit\?limit=25$/);
  await expect(page.getByText("گزارش ممیزی در دسترس نیست.")).toBeVisible();

  await expectNoViewportOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
