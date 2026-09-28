import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Residual route semantic-surface wave 1", () => {
  it("keeps analytics, marketing, PWA and standalone states theme-safe", () => {
    const files = [
      "app/analytics/cohorts/cohorts-reference.module.css",
      "app/marketing/marketing.module.css",
      "app/marketing/content-calendar/calendar.module.css",
      "app/pwa.css",
      "app/standalone-state.module.css",
    ];

    for (const file of files) {
      const css = read(file);
      expect(css).toContain("var(--lm-surface-raised)");
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    }

    expect(read(files[0])).toContain("var(--lm-orange-soft)");
    expect(read(files[1])).toContain("var(--lm-focus)");
    expect(read(files[2])).toContain("var(--lm-danger)");
    expect(read(files[3])).toContain("var(--lm-green-deep)");
    expect(read(files[4])).toContain("@media (max-width: 520px)");
  });
});
