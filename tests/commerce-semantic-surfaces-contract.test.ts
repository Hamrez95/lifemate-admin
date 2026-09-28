import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Commerce semantic surfaces", () => {
  it("keeps commerce overview surfaces theme-safe and responsive", () => {
    const commerceCss = read("app/commerce/commerce.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(commerceCss).toContain("var(--lm-surface-raised)");
    expect(commerceCss).toContain("var(--lm-focus)");
    expect(commerceCss).toContain("var(--lm-blue-soft)");
    expect(commerceCss).toContain(".summaryGrid");
    expect(commerceCss).toContain("@media (max-width: 640px)");
    expect(commerceCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Commerce semantic-surface wave");
  });
});
