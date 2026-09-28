import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Founder auth semantic surfaces", () => {
  it("keeps the three-mode auth workspace theme-safe", () => {
    const founderAuthCss = read("app/admin-auth-founder.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(founderAuthCss).toContain("var(--lm-surface-raised)");
    expect(founderAuthCss).toContain("var(--lm-green-deep)");
    expect(founderAuthCss).toContain("@media (max-width: 680px)");
    expect(founderAuthCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Founder auth semantic-surface wave");
  });
});
