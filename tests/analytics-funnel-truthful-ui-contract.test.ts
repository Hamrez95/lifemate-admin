import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/analytics/funnel/page.tsx"), "utf8");

describe("activation funnel truthful Persian UI", () => {
  it("keeps readiness, partial data and privacy suppression distinct from a numeric value", () => {
    expect(source).toContain("داده آماده است");
    expect(source).toContain("بخشی از داده آماده است");
    expect(source).toContain("فعلاً قابل دریافت نیست");
    expect(source).toContain("به‌دلیل حریم خصوصی نمایش داده نمی‌شود");
    expect(source).not.toContain('"Suppressed"');
  });

  it("renders aggregate dates in Jalali Tehran time and avoids a full-width count bar", () => {
    expect(source).toContain('"fa-IR-u-ca-persian"');
    expect(source).toContain('timeZone: "Asia/Tehran"');
    expect(source).toContain("width !== null");
    expect(source).not.toContain(": 100;");
  });
});
