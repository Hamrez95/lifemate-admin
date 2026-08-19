import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const authOrigin = "http://127.0.0.1:54321/auth/v1";

function authRequest(path: string) {
  return (response: { url(): string }) => response.url().startsWith(`${authOrigin}${path}`);
}

test("existing account completes password auth then TOTP MFA before an authorized workspace is rendered", async ({
  page,
}) => {
  const authRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(authOrigin)) {
      authRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  await page.goto("/login");
  await page.getByLabel("ایمیل حساب LifeMate").fill("founder@lifemate.test");
  await page.getByLabel("رمز عبور LifeMate").fill("qa-password-123");

  const passwordRequest = page.waitForResponse((response) =>
    response.url().startsWith(`${authOrigin}/token?grant_type=password`),
  );
  await page.getByRole("button", { name: "ادامه ورود امن" }).click();
  expect((await passwordRequest).ok()).toBe(true);

  await expect(page.getByRole("heading", { name: "تأیید دومرحله‌ای" })).toBeVisible();
  await expect(page.getByText(/Command Center نشست AAL2 را الزامی می‌کند/)).toBeVisible();

  await page.getByLabel("کد Authenticator").fill("654321");
  await page.getByRole("button", { name: "ورود امن" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "مرکز فرماندهی" })).toBeVisible();
  expect(authRequests.some((value) => value === "POST /auth/v1/token")).toBe(true);
  expect(
    authRequests.some((value) => value.includes("/factors/") && value.endsWith("/challenge")),
  ).toBe(true);
  expect(
    authRequests.some((value) => value.includes("/factors/") && value.endsWith("/verify")),
  ).toBe(true);

  await page.goto("/operations");
  await expect(page.getByRole("heading", { name: "عملیات" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "دسترسی این فضا از سمت سرور تأیید شد." }),
  ).toBeVisible();
  await expect(page.getByText(/نمایش منو صرفاً UX است/)).toBeVisible();

  const a11y = await new AxeBuilder({ page }).analyze();
  expect(
    a11y.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
  await expect(page).toHaveScreenshot("authorized-operations-workspace.png", { fullPage: true });
});
