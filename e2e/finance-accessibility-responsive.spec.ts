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
  const viewportOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(viewportOverflow).toBe(false);
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(
    a11y.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

test("finance P&L renders canonical actuals accessibly without viewport overflow", async ({
  page,
}) => {
  await signInWithMfa(page);
  await page.goto("/finance");

  await expect(page.getByRole("heading", { name: "نمای کلی مالی LifeMate" })).toBeVisible();
  await expect(page.getByText("Actual revenue")).toBeVisible();
  await expect(page.getByText("Actual expenses")).toBeVisible();
  await expect(
    page.getByLabel("شاخص‌های اصلی سود و زیان").getByText("Forecast", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/No canonical forecast source is configured/)).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row", { name: /سود ناخالص/ })).toContainText(
    "تعریف canonical برای COGS",
  );
  await expectNoViewportOverflow(page);

  const filters = page.getByRole("form", { name: "فیلتر بازه گزارش" });
  await expect(filters).toBeVisible();
  await page.getByLabel("از تاریخ").fill("2026-08-01");
  await page.getByLabel("تا تاریخ").fill("2026-08-17");
  await page.getByRole("button", { name: "اعمال بازه" }).click();
  await expect(page).toHaveURL(/\/finance\?/);
  const filteredUrl = new URL(page.url());
  expect(filteredUrl.searchParams.get("from")).toBe("2026-08-01");
  expect(filteredUrl.searchParams.get("to")).toBe("2026-08-17");
  await expectNoViewportOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("finance budget comparison is explicit, accessible, and responsive", async ({ page }) => {
  await signInWithMfa(page);
  await page.goto("/finance/budget");

  await expect(page.getByRole("heading", { name: "بودجه در برابر عملکرد واقعی" })).toBeVisible();
  await expect(page.getByText("بودجه عملیاتی مصوب")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row", { name: /حقوق و مزایا/ })).toContainText("مطلوب");
  await expect(page.getByText(/بودجه ثبت نشده/)).toHaveCount(0);
  await expectNoViewportOverflow(page);

  const filters = page.getByRole("form", { name: "فیلتر بازه بودجه" });
  await expect(filters).toBeVisible();
  await page.getByLabel("از ماه").fill("2026-08");
  await page.getByLabel("تا ماه").fill("2026-08");
  await page.getByRole("button", { name: "اعمال بازه" }).click();
  await expect(page).toHaveURL(/\/finance\/budget\?/);
  const filteredUrl = new URL(page.url());
  expect(filteredUrl.searchParams.get("fromMonth")).toBe("2026-08");
  expect(filteredUrl.searchParams.get("toMonth")).toBe("2026-08");
  await expectNoViewportOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
