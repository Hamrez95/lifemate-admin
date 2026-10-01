import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Residual route semantic-surface wave 1", () => {
  it("keeps analytics, marketing, PWA and standalone states theme-safe", () => {
    const cohortsCss = read("app/analytics/cohorts/cohorts-reference.module.css");
    const marketingCss = read("app/marketing/marketing.module.css");
    const calendarCss = read("app/marketing/content-calendar/calendar.module.css");
    const pwaCss = read("app/pwa.css");
    const standaloneCss = read("app/standalone-state.module.css");
    const files = [cohortsCss, marketingCss, calendarCss, pwaCss, standaloneCss];

    for (const css of files) {
      expect(css).toContain("var(--lm-surface-raised)");
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    }

    expect(cohortsCss).toContain("var(--lm-orange-soft)");
    expect(marketingCss).toContain("var(--lm-focus)");
    expect(calendarCss).toContain("var(--lm-danger)");
    expect(pwaCss).toContain("var(--lm-green-deep)");
    expect(standaloneCss).toContain("@media (max-width: 520px)");
  });
});
