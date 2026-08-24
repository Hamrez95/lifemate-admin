import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Finance references 14-16", () => {
  it("uses the approved finance hero and keeps RTL responsive safeguards", () => {
    const css = source("app/finance/finance.module.css");
    expect(css).toContain('/design-assets/finance-hero-v1.png');
    expect(css).toContain("direction: rtl");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("keeps canonical money precision and a single finance timezone policy", () => {
    const format = source("app/finance/format.ts");
    const overview = source("app/finance/page.tsx");
    const budget = source("app/finance/budget/page.tsx");
    expect(format).toContain('FINANCE_TIME_ZONE = "Asia/Tehran"');
    expect(format).toContain("BigInt(amountMinor)");
    expect(overview).toContain("BigInt(amountMinor)");
    expect(budget).toContain("BigInt(amountMinor)");
    expect(overview).not.toContain("parseFloat(amountMinor)");
    expect(budget).not.toContain("parseFloat(amountMinor)");
  });

  it("does not invent scenario persistence or client-side financial export", () => {
    const scenario = source("app/finance/scenario/page.tsx");
    expect(scenario).toContain("Scenario API · Unavailable");
    expect(scenario).toContain("ذخیره سناریو — در دسترس نیست");
    expect(scenario).toContain("Export · Unavailable");
    expect(scenario).not.toContain("fetch(");
    expect(scenario).not.toContain("form action=");
    expect(scenario).not.toContain("Blob(");
  });

  it("provides loading and error states without fabricated fallback values", () => {
    const loading = source("app/finance/loading.tsx");
    const error = source("app/finance/error.tsx");
    expect(loading).toContain('aria-busy="true"');
    expect(error).toContain("هیچ عدد جایگزین");
    expect(error).toContain("reset");
  });
});
