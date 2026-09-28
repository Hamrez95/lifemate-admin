import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Finance scenario semantic surfaces", () => {
  it("keeps the scenario form theme-safe and keyboard-visible", () => {
    const scenarioCss = read("app/finance/scenario/scenario-form.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(scenarioCss).toContain("var(--lm-surface-raised)");
    expect(scenarioCss).toContain("var(--lm-focus)");
    expect(scenarioCss).toContain("var(--lm-border-strong)");
    expect(scenarioCss).toContain("@media (max-width: 640px)");
    expect(scenarioCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Finance scenario semantic-surface wave");
  });
});
