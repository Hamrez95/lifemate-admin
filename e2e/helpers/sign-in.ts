import { expect, type Page } from "@playwright/test";

export async function signInWithMfa(page: Page) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری", { exact: true }).fill("staff.test");
  await page.getByLabel("رمز عبور", { exact: true }).fill("qa-password");
  await page.getByRole("button", { name: "ورود با نام کاربری" }).click();
  await expect(page.getByRole("heading", { name: "تأیید دومرحله‌ای" })).toBeVisible();
  await page.getByLabel("کد Authenticator").fill("654321");
  await page.getByRole("button", { name: "ورود امن" }).click();
  await expect(page).toHaveURL(/\/$/);
}
