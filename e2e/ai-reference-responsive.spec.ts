import { expect, test, type Page } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

test("AI Daily Brief is truthful, safe and touch-friendly on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInWithMfa(page);
  await page.goto("/ai/daily-brief");

  await expect(page.getByRole("heading", { name: /صبح را با یک تصویر کوتاه/ })).toBeVisible();
  await expect(page.getByAltText(/گزارش روزانه هوشمند LifeMate/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "این قابلیت هنوز به قرارداد Core متصل نشده است" }),
  ).toBeVisible();
  await expect(page.getByText("هیچ مقدار ساختگی نیست")).toBeVisible();
  await expectNoViewportOverflow(page);

  const tabs = page.getByRole("navigation", { name: "بخش‌های هوش مصنوعی" }).getByRole("link");
  expect(await tabs.count()).toBe(2);
  const box = await tabs.first().boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test("AI Advisor keeps the reference hero visible while authorization stays fail-closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInWithMfa(page);
  await page.goto("/ai");

  await expect(
    page.getByRole("heading", { name: /از داده تأییدشده سؤال مدیریتی بپرس/ }),
  ).toBeVisible();
  await expect(page.getByAltText(/مشاور هوشمند LifeMate/)).toBeVisible();
  await expect(page.getByText("دسترسی مشاور فعال نیست")).toBeVisible();
  await expectNoViewportOverflow(page);
});
