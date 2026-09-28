import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security context header semantic surfaces", () => {
  it("keeps shared security context navigation theme-safe", () => {
    const headerCss = read("src/components/security/security-context-header.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(headerCss).toContain("var(--lm-surface-raised)");
    expect(headerCss).toContain("var(--lm-focus)");
    expect(headerCss).toContain("var(--lm-orange-soft)");
    expect(headerCss).toContain("@media (max-width: 560px)");
    expect(headerCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Security context header semantic-surface wave");
  });
});
