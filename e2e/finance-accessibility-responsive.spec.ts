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

  const viewportOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(viewportOverflow).toBe(false);

  const a11y = await new AxeBuilder({ page }).analyze();
  expect(
    a11y.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});
