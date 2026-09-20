import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/analytics/cohorts/page.tsx"), "utf8");

describe("retention cohorts truthful Persian UI", () => {
  it("does not turn a missing cohort size into zero", () => {
    expect(source).toMatch(/row\.size === null\s*\? "—"\s*:\s*number\.format\(row\.size\)/);
    expect(source).not.toContain("number.format(row.size ?? 0)");
  });

  it("keeps readiness and privacy suppression understandable in Persian", () => {
    expect(source).toContain("داده آماده است");
    expect(source).toContain("بخشی از داده آماده است");
    expect(source).toContain("به‌دلیل حریم خصوصی نمایش داده نمی‌شود");
    expect(source).toContain('"fa-IR-u-ca-persian"');
  });
});
