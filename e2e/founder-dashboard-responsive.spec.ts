import { expect, test } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

test("Founder dashboard stays concise and touch-friendly without viewport overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInWithMfa(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /پالس اجرایی LifeMate/ })).toBeVisible();
  await expect(page.getByAltText(/اکوسیستم LifeMate برای داشبورد Founder/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "آنچه الان باید ببینید" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "نیازمند توجه" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "فعالیت‌های اخیر" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "وضعیت سرویس‌ها" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);

  const shortcuts = page
    .getByRole("navigation", { name: "مسیرهای سریع مرکز فرماندهی" })
    .getByRole("link");
  if ((await shortcuts.count()) > 0) {
    const first = shortcuts.first();
    const box = await first.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
