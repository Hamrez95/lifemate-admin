import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

describe("founder growth analytics contract", () => {
  it("uses only the canonical server-side growth endpoint", async () => {
    const client = await source("src/lib/admin-api/growth-analytics.ts");
    const page = await source("app/analytics/growth/page.tsx");

    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/analytics/growth");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(page).not.toContain("product_activity_events");
  });

  it("preserves scope, coverage and no-fabrication semantics", async () => {
    const client = await source("src/lib/admin-api/growth-analytics.ts");
    const page = await source("app/analytics/growth/page.tsx");

    expect(client).toContain("accountScoped");
    expect(client).toContain("personScoped");
    expect(client).toContain("noFabrication: true");
    expect(client).toContain("activityCoverage?: GrowthActivityCoverage");
    expect(client).toContain("numerator?: number | null");
    expect(client).toContain("denominator?: number | null");
    expect(page).toContain("به‌جای صفر ساختگی وضعیت واقعی داده را می‌بینید");
  });

  it("preserves non-ready states and never coerces missing active-user data to zero", async () => {
    const client = await source("src/lib/admin-api/growth-analytics.ts");
    const page = await source("app/analytics/growth/page.tsx");

    expect(client).toContain('"not_enough_data"');
    expect(client).toContain('"not_instrumented"');
    expect(client).toContain('"delayed"');
    expect(page).toContain('if (metric.value === null) return "—"');
    expect(page).toContain("این اندازه‌گیری هنوز فعال نشده");
    expect(page).toContain("هنوز داده کافی نداریم");
    expect(page).toContain("داده با تأخیر دریافت می‌شود");
  });

  it("uses founder-first Persian active-user labels with inspectable definitions", async () => {
    const page = await source("app/analytics/growth/page.tsx");

    expect(page).toContain("کاربران فعال امروز");
    expect(page).toContain("کاربران فعال ۷ روز اخیر");
    expect(page).toContain("کاربران فعال ۳۰ روز اخیر");
    expect(page).toContain("چند درصد کاربران ماهانه امروز هم برگشته‌اند؟");
    expect(page).toContain("چند درصد کاربران ماهانه این هفته فعال بوده‌اند؟");
    expect(page).toContain("کاربران فعال جدید امروز");
    expect(page).toContain("کاربران بازگشتی امروز");
    expect(page).toContain("این عدد چیست؟");
    expect(page).toContain("چرا مهم است؟");
    expect(page).toContain("این عدد چگونه محاسبه شده؟");
    expect(page).toContain("metric.numerator");
    expect(page).toContain("metric.denominator");
  });

  it("compares periods only when both sides are fully ready", async () => {
    const page = await source("app/analytics/growth/page.tsx");

    expect(page).toContain('metric.state === "ready"');
    expect(page).toContain('availability(metric) === "ready"');
    expect(page).toContain("!isComparable(current)");
    expect(page).toContain("!isComparable(previous)");
    expect(page).toContain("برای مقایسه هنوز داده کامل نداریم");
  });

  it("requires analytics.read and keeps export unavailable without a canonical contract", async () => {
    const page = await source("app/analytics/growth/page.tsx");
    expect(page).toContain('admin.permissions.includes("analytics.read")');
    expect(page).toContain("aggregate export contract");
    expect(page).toContain("disabled");
  });
});
