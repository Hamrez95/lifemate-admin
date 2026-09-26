import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Analytics/Funnel migration wave", () => {
  it("uses semantic v2 tokens without literal route colors", () => {
    const styles = read("app/analytics/funnel/funnel.module.css");

    expect(styles).toContain("var(--lm-surface)");
    expect(styles).toContain("var(--lm-violet-soft)");
    expect(styles).toContain("var(--lm-focus)");
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/iu);
  });

  it("keeps canonical-only data semantics and route states explicit", () => {
    const page = read("app/analytics/funnel/page.tsx");
    const loading = read("app/analytics/funnel/loading.tsx");
    const error = read("app/analytics/funnel/error.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(page).toContain("getKpiValues");
    expect(page).toContain("hasCanonicalFunnel");
    expect(page).toContain("state=\"unavailable\"");
    expect(loading).toContain("LoadingState");
    expect(error).toContain("ErrorState");
    expect(error).toContain("onClick={reset}");
    expect(research).toContain("Analytics/Funnel migration wave");
  });
});
