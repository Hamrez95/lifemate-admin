import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const authOrigin = "http://127.0.0.1:54321/auth/v1";

function authRequest(path: string) {
  return (response: { url(): string }) => response.url().startsWith(`${authOrigin}${path}`);
}

test("existing account completes OTP then TOTP MFA before an authorized workspace is rendered", async ({
  page,
}) => {
  const authRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(authOrigin)) {
      authRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  await page.goto("/login");
  await page.getByLabel("شماره موبایل حساب LifeMate").fill("09121234567");

  const otpRequest = page.waitForResponse(authRequest("/otp"));
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  expect((await otpRequest).ok()).toBe(true);
  await expect(page.getByText("کد یک‌بارمصرف برای حساب موجود ارسال شد.")).toBeVisible();

  await page.getByLabel("کد پیامک").fill("123456");
  const verifyOtp = page.waitForResponse(authRequest("/verify"));
  await page.getByRole("button", { name: "تأیید کد" }).click();
  expect((await verifyOtp).ok()).toBe(true);

  await expect(page.getByRole("heading", { name: "تأیید دومرحله‌ای" })).toBeVisible();
  await expect(page.getByText(/Command Center نشست AAL2 را الزامی می‌کند/)).toBeVisible();

  await page.getByLabel("کد Authenticator").fill("654321");
  await page.getByRole("button", { name: "ورود امن" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "مرکز فرماندهی" })).toBeVisible();
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
