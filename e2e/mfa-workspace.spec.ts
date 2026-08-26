import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const authOrigin = "http://127.0.0.1:54321/auth/v1";
const workforceAuthPath = "/api/auth/workforce";

function workforceAuthRequest(response: { url(): string }) {
  return new URL(response.url()).pathname === workforceAuthPath;
}

test("active staff completes username/password then TOTP MFA before an authorized workspace is rendered", async ({
  page,
}) => {
  const authRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(authOrigin)) {
      authRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  await page.goto("/login");
  await page.getByLabel("نام کاربری", { exact: true }).fill("staff.test");
  await page.getByLabel("رمز عبور", { exact: true }).fill("qa-password");

  const loginRequest = page.waitForResponse(workforceAuthRequest);
  await page.getByRole("button", { name: "ورود با نام کاربری" }).click();
  expect((await loginRequest).ok()).toBe(true);

  await expect(page.getByRole("heading", { name: "تأیید دومرحله‌ای" })).toBeVisible();
  await expect(page.getByText(/Command Center نشست AAL2 را الزامی می‌کند/)).toBeVisible();

  await page.getByLabel("کد Authenticator").fill("654321");
  await page.getByRole("button", { name: "ورود امن" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "مرکز فرماندهی" })).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "ناوبری اصلی Command Center" })
      .getByRole("link", { name: "پروفایل و تغییر رمز عبور" }),
  ).toBeVisible();
  expect(
    authRequests.some((value) => value.includes("/factors/") && value.endsWith("/challenge")),
  ).toBe(true);
  expect(
    authRequests.some((value) => value.includes("/factors/") && value.endsWith("/verify")),
  ).toBe(true);

  await page.goto("/operations");
  await expect(page.getByRole("heading", { name: "عملیات", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "مرکز عملیات LifeMate" })).toBeVisible();
  await expect(page.getByText(/Operational visibility فعلاً در دسترس نیست/)).toBeVisible();

  const a11y = await new AxeBuilder({ page }).analyze();
  expect(
    a11y.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});
