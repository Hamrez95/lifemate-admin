import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "app/finance/page.tsx"), "utf8");
const loadingSource = readFileSync(resolve(process.cwd(), "app/finance/loading.tsx"), "utf8");

describe("ADM-FIN-001 finance workspace contract", () => {
  it("requires finance.read at the route boundary", () => {
    expect(pageSource).toContain('admin.permissions.includes("finance.read")');
    expect(pageSource).toContain('redirect("/forbidden")');
  });

  it("uses the server-only finance read model and keeps ACTUAL and FORECAST separate", () => {
    expect(pageSource).toContain("getFinanceProfitLoss");
    expect(pageSource).toContain("ACTUAL");
    expect(pageSource).toContain("FORECAST");
    expect(pageSource).toContain("Forecast از\n                Actual استنباط نمی‌شود");
  });

  it("does not invent missing finance, FX, forecast, budget or gross-profit values", () => {
    expect(pageSource).toContain('value: "—"');
    expect(pageSource).toContain("تبدیل ارزی خودکار انجام نمی‌شود");
    expect(pageSource).toContain("مقدار صفر فرض نشده است");
    expect(pageSource).toContain("تعریف canonical برای COGS / هزینه مستقیم");
    expect(pageSource).toContain("هیچ FX، forecast، budget، gross profit یا");
  });

  it("exposes an explicit period filter and loading state", () => {
    expect(pageSource).toContain('aria-label="فیلتر بازه گزارش"');
    expect(pageSource).toContain('name="from"');
    expect(pageSource).toContain('name="to"');
    expect(loadingSource).toContain('aria-busy="true"');
    expect(loadingSource).toContain("در حال بارگذاری گزارش مالی");
  });
});
