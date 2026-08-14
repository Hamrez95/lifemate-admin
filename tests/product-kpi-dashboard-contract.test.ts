import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-ANL-001 Product KPI dashboard", () => {
  it("uses the Admin API and never reads the database directly", () => {
    const client = source("src/lib/admin-api/analytics-kpis.ts");

    expect(client).toContain("/api/v1/analytics/kpis");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("women_calendar");
    expect(client).not.toContain("medications");
    expect(client).not.toContain("health_observations");
  });

  it("keeps unavailable and partial values visibly distinct from zero", () => {
    const page = source("app/analytics/page.tsx");

    expect(page).toContain('value.state === "unavailable"');
    expect(page).toContain('value.state === "partial"');
    expect(page).toContain('return "—"');
    expect(page).toContain("داده محدود اما واقعی");
    expect(page).toContain("هنوز اندازه‌گیری نشده");
    expect(page).toContain("نمودار ساختگی نمایش داده نمی‌شود");
  });

  it("enforces analytics permission and includes an accessible chart summary", () => {
    const page = source("app/analytics/page.tsx");

    expect(page).toContain('permissions.includes("analytics.read")');
    expect(page).toContain('role="img"');
    expect(page).toContain("aria-label");
    expect(page).toContain("وضعیت منبع");
  });

  it("ships a responsive colorful LifeMate-specific visual layer", () => {
    const css = source("app/analytics/analytics.module.css");

    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-violet)");
    expect(css).toContain("@media (max-width: 680px)");
    expect(css).toContain("prefers-reduced-motion");
  });
});
