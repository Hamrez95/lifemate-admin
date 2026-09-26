import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Finance migration wave", () => {
  it("uses semantic v2 tokens instead of route-local raw colors", () => {
    const styles = read("app/finance/finance.module.css");

    expect(styles).toContain("var(--lm-surface-raised)");
    expect(styles).toContain("var(--lm-text-muted)");
    expect(styles).toContain("var(--lm-action-primary-hover)");
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/iu);
  });

  it("keeps truthful Finance states and the Buffer research trail explicit", () => {
    const page = read("app/finance/page.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(page).toContain("Actual معتبر برای این گزارش در دسترس نیست");
    expect(page).toContain("Forecast");
    expect(research).toContain("Getting started with Buffer analytics");
    expect(research).toContain("Profile/Settings migration wave");
  });
});
