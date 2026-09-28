import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security layout semantic surfaces", () => {
  it("keeps the shared security layout theme-safe and responsive", () => {
    const layoutCss = read("app/security/security-layout.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(layoutCss).toContain("var(--lm-surface-raised)");
    expect(layoutCss).toContain("var(--lm-focus)");
    expect(layoutCss).toContain("var(--lm-green-soft)");
    expect(layoutCss).toContain("@media (max-width: 520px)");
    expect(layoutCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Security layout semantic-surface wave");
  });
});
