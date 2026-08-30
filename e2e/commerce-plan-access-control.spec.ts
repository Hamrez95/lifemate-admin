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

test("commerce plan control redirects an unauthenticated browser to workforce login", async ({
  page,
}) => {
  await page.goto("/commerce/plans");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("نام کاربری", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ادامه به تأیید دومرحله‌ای" })).toBeVisible();
  await expect(page.getByText("commerce.plan.write")).toHaveCount(0);
  await expect(page.getByText("commerce.price.write")).toHaveCount(0);

  await expectNoViewportOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("authorized staff without commerce permission is denied before write controls render", async ({
  page,
}) => {
  await signInWithMfa(page);
  await page.goto("/commerce/plans");

  await expect(page).toHaveURL(/\/commerce\/plans$/);
  await expect(page.locator('section[role="alert"][data-state="forbidden"]')).toContainText(
    "دسترسی مجاز نیست",
  );
  await expect(page.getByText("برای مشاهده این بخش مجوز لازم را ندارید.")).toBeVisible();
  await expect(page.getByText("commerce.plan.write")).toHaveCount(0);
  await expect(page.getByText("commerce.price.write")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /ساخت پلن|ثبت تغییر|ثبت نسخه جدید قیمت/ }),
  ).toHaveCount(0);

  await expectNoViewportOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
