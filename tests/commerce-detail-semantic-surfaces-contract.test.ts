import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Commerce detail semantic surfaces", () => {
  it("keeps subscription detail, rules and timeline surfaces theme-safe", () => {
    const detailCss = read("app/commerce/detail.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(detailCss).toContain("var(--lm-surface-raised)");
    expect(detailCss).toContain("var(--lm-focus)");
    expect(detailCss).toContain("var(--lm-violet-soft)");
    expect(detailCss).toContain(".timelineSection");
    expect(detailCss).toContain("@media (max-width: 680px)");
    expect(detailCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Commerce detail semantic-surface wave");
  });
});
