import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Analytics/Growth migration wave", () => {
  it("uses canonical semantic tokens for the Growth workspace", () => {
    const styles = read("app/analytics/growth/growth.module.css");

    expect(styles).toContain("var(--lm-border)");
    expect(styles).toContain("var(--lm-surface-raised)");
    expect(styles).toContain("var(--lm-text-muted)");
    expect(styles).not.toMatch(
      /--(?:border-subtle|surface-panel|surface-raised|text-muted|text-primary)\b/u,
    );
  });

  it("keeps loading/error states and truthful metric semantics explicit", () => {
    const page = read("app/analytics/growth/page.tsx");
    const loading = read("app/analytics/growth/loading.tsx");
    const error = read("app/analytics/growth/error.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(page).toContain("getGrowthAnalytics");
    expect(page).toContain("not_enough_data");
    expect(loading).toContain("LoadingState");
    expect(error).toContain("ErrorState");
    expect(error).toContain("onClick={reset}");
    expect(research).toContain("Finance migration wave");
  });
});
