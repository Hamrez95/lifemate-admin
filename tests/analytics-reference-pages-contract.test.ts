import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}
describe("Analytics references 6 / 9 / 24", () => {
  it("keeps all charts on canonical analytics sources", () => {
    const overview = source("app/analytics/page.tsx");
    const funnel = source("app/analytics/funnel/page.tsx");
    const cohorts = source("app/analytics/cohorts/page.tsx");
    const kpis = source("src/lib/admin-api/analytics-kpis.ts");
    const catalog = source("src/lib/admin-api/analytics-catalog.ts");

    expect(kpis).toContain("/api/v1/analytics/kpis");
    expect(catalog).toContain("/api/v1/analytics/catalog");
    expect(overview).toContain("getKpiValues");
    expect(funnel).toContain("getKpiValues");
    expect(cohorts).toContain("getAnalyticsCohorts");
    expect(overview).not.toContain("Math.random");
    expect(funnel).not.toContain("Math.random");
    expect(cohorts).not.toContain("Math.random");
  });

  it("fails closed for unsupported export while allowing canonical aggregate drill-down", () => {
    const overview = source("app/analytics/page.tsx");
    const funnel = source("app/analytics/funnel/page.tsx");
    const cohorts = source("app/analytics/cohorts/page.tsx");

    for (const page of [overview, cohorts]) {
      expect(page).toContain("disabled");
      expect(page).toContain("endpoint canonical");
    }

    expect(funnel).toContain("disabled");
    expect(funnel).toContain("قرارداد canonical برای فایل export هنوز تعریف نشده است");
    expect(funnel).toContain('href="#aggregate-drilldown"');
    expect(funnel).toContain('id="aggregate-drilldown"');
    expect(funnel).toContain("فقط aggregate روزانه نمایش داده می‌شود");
    expect(funnel).not.toContain("endpoint اختصاصی funnel هنوز در Core وجود ندارد");
  });

  it("supports loading, unavailable, forbidden and error states", () => {
    for (const path of ["app/analytics/page.tsx", "app/analytics/cohorts/page.tsx"]) {
      const page = source(path);
      expect(page).toContain('state="loading"');
      expect(page).toContain('state="unavailable"');
      expect(page).toContain('state="forbidden"');
    }
    expect(source("app/analytics/page.tsx")).toContain('state="error"');
    expect(source("app/analytics/cohorts/page.tsx")).toContain('state="error"');
  });

  it("ships keyboard-accessible chart tooltips and mobile layouts", () => {
    const overview = source("app/analytics/page.tsx");
    const funnel = source("app/analytics/funnel/page.tsx");
    const cohorts = source("app/analytics/cohorts/page.tsx");
    const overviewCss = source("app/analytics/analytics-reference.module.css");
    const funnelCss = source("app/analytics/funnel/funnel.module.css");
    const cohortsCss = source("app/analytics/cohorts/cohorts-reference.module.css");

    expect(overview).toContain("tabIndex={0}");
    expect(funnel).toContain('role="tooltip"');
    expect(cohorts).toContain("tabIndex={0}");
    expect(overviewCss).toContain("@media (max-width: 680px)");
    expect(funnelCss).toContain("@media (max-width: 620px)");
    expect(cohortsCss).toContain("@media (max-width: 680px)");
  });
});
